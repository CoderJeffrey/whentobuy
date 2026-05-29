import { DateTime } from "luxon";
import YahooFinance from "yahoo-finance2";
import type { ChartResultArray } from "yahoo-finance2/modules/chart";
import { getDb } from "../db.js";
import { computeIndicators } from "../indicators.js";

export class TickerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Ticker not found: ${ticker}`);
    this.name = "TickerNotFoundError";
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Yahoo Finance rate limit hit");
    this.name = "RateLimitError";
  }
}

export class NetworkError extends Error {
  constructor(cause: string) {
    super(`Network error: ${cause}`);
    this.name = "NetworkError";
  }
}

const yahooFinance = new YahooFinance();
yahooFinance._notices.suppress(["yahooSurvey", "ripHistorical"]);

// SEC uses dots for class shares (BRK.B); Yahoo uses dashes (BRK-B).
// Our storage form is whatever came from SEC, but convert defensively.
export function toYahooTicker(ticker: string): string {
  return ticker.replace(/\./g, "-");
}

/**
 * Map a stored (ticker, exchange) to the symbol yahoo-finance2 understands.
 * US uses the dash class-share form; China appends the exchange suffix
 * (600519 + SS → 600519.SS, 000001 + SZ → 000001.SZ).
 */
export function toYahooSymbol(ticker: string, exchange: string): string {
  if (exchange.toUpperCase() === "US") return toYahooTicker(ticker);
  return `${ticker}.${exchange.toUpperCase()}`;
}

function isoDate(d: Date): string {
  // Yahoo's bar `date` is an instant; the US daily session belongs to the
  // exchange tz. Slicing the UTC date can land one day off (e.g. label a
  // May 21 close as May 20), so resolve the date in America/New_York.
  return (
    DateTime.fromJSDate(d).setZone("America/New_York").toISODate() ??
    d.toISOString().slice(0, 10)
  );
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function num(v: number | null | undefined): string {
  return v == null ? "NULL" : String(v);
}

async function isCached(ticker: string, exchange: string): Promise<boolean> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT status FROM ticker_cache WHERE ticker = ${sqlLit(ticker)} AND exchange = ${sqlLit(exchange)}`,
  );
  const rows = reader.getRowObjectsJS();
  return rows.length > 0 && rows[0]!.status === "ok";
}

function classifyYahooError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("not found") ||
    lower.includes("no data") ||
    lower.includes("404") ||
    lower.includes("invalid symbol")
  ) {
    return new TickerNotFoundError("");
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many")
  ) {
    return new RateLimitError();
  }
  if (
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  ) {
    return new NetworkError(msg);
  }
  return new NetworkError(msg);
}

async function markCache(
  ticker: string,
  exchange: string,
  status: "ok" | "failed",
): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO ticker_cache (ticker, exchange, last_fetched_at, status)
     VALUES (${sqlLit(ticker)}, ${sqlLit(exchange)}, now(), ${sqlLit(status)})
     ON CONFLICT (ticker, exchange) DO UPDATE
       SET last_fetched_at = now(), status = ${sqlLit(status)}`,
  );
}

export async function refreshAllCachedTickers(): Promise<{
  ok: number;
  failed: number;
}> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT DISTINCT ticker, exchange FROM ticker_cache`,
  );
  const entries = reader
    .getRowObjectsJS()
    .map((r) => ({ ticker: String(r.ticker), exchange: String(r.exchange) }));
  console.log(`[refresh] refreshing ${entries.length} ticker(s)`);

  let ok = 0;
  let failed = 0;
  for (const e of entries) {
    try {
      await ensureTickerData(e.ticker, e.exchange, { force: true });
      ok += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[refresh] ${e.ticker}.${e.exchange} failed:`, err);
    }
  }
  console.log(`[refresh] complete: ${ok} ok, ${failed} failed`);
  return { ok, failed };
}

export async function ensureTickerData(
  ticker: string,
  exchange = "US",
  opts: { force?: boolean } = {},
): Promise<void> {
  const sym = ticker.toUpperCase();
  const exch = exchange.toUpperCase();
  if (!opts.force && (await isCached(sym, exch))) return;

  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 3);

  let chart: ChartResultArray;
  try {
    chart = await yahooFinance.chart(toYahooSymbol(sym, exch), {
      period1,
      period2,
      interval: "1d",
      return: "array",
    });
  } catch (err) {
    const classified = classifyYahooError(err);
    if (classified instanceof TickerNotFoundError) {
      classified.message = `Ticker not found: ${sym}`;
    }
    await markCache(sym, exch, "failed");
    throw classified;
  }

  const quotes = chart.quotes.filter(
    (q) =>
      q.open != null &&
      q.high != null &&
      q.low != null &&
      q.close != null &&
      q.volume != null,
  );

  if (quotes.length === 0) {
    await markCache(sym, exch, "failed");
    throw new TickerNotFoundError(sym);
  }

  const closes = quotes.map((q) => q.close as number);
  const volumes = quotes.map((q) => q.volume as number);
  const ind = computeIndicators(closes, volumes);

  const db = await getDb();
  await db.run(
    `DELETE FROM prices WHERE ticker = ${sqlLit(sym)} AND exchange = ${sqlLit(exch)}`,
  );
  await db.run(
    `DELETE FROM indicators WHERE ticker = ${sqlLit(sym)} AND exchange = ${sqlLit(exch)}`,
  );

  const priceValuesSql = quotes
    .map((q) => {
      const d = sqlLit(isoDate(q.date));
      const adj = q.adjclose ?? q.close;
      return `(${sqlLit(sym)}, ${sqlLit(exch)}, ${d}, ${q.open}, ${q.high}, ${q.low}, ${q.close}, ${adj}, ${q.volume})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO prices (ticker, exchange, date, open, high, low, close, adj_close, volume) VALUES\n${priceValuesSql}`,
  );

  const indicatorValuesSql = quotes
    .map((q, i) => {
      const d = sqlLit(isoDate(q.date));
      const cols = [
        num(ind.rsi14[i]),
        num(ind.sma20[i]),
        num(ind.sma50[i]),
        num(ind.sma200[i]),
        num(ind.macd[i]),
        num(ind.macdSignal[i]),
        ind.macdCrossUp[i] == null ? "NULL" : String(ind.macdCrossUp[i]),
        num(ind.bbLower[i]),
        num(ind.pctFrom52wLow[i]),
        num(ind.volumeAvg20[i]),
      ];
      return `(${sqlLit(sym)}, ${sqlLit(exch)}, ${d}, ${cols.join(", ")})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO indicators (ticker, exchange, date, rsi_14, sma_20, sma_50, sma_200, macd, macd_signal, macd_cross_up, bb_lower, pct_from_52w_low, volume_avg_20) VALUES\n${indicatorValuesSql}`,
  );

  await markCache(sym, exch, "ok");
}
