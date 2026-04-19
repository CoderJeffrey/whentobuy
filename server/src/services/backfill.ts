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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function num(v: number | null | undefined): string {
  return v == null ? "NULL" : String(v);
}

async function isCached(ticker: string): Promise<boolean> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT status FROM ticker_cache WHERE ticker = ${sqlLit(ticker)}`,
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

async function markCache(ticker: string, status: "ok" | "failed"): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO ticker_cache (ticker, last_fetched_at, status)
     VALUES (${sqlLit(ticker)}, now(), ${sqlLit(status)})
     ON CONFLICT (ticker) DO UPDATE
       SET last_fetched_at = now(), status = ${sqlLit(status)}`,
  );
}

export async function ensureTickerData(
  ticker: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  const sym = ticker.toUpperCase();
  if (!opts.force && (await isCached(sym))) return;

  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 3);

  let chart: ChartResultArray;
  try {
    chart = await yahooFinance.chart(sym, {
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
    await markCache(sym, "failed");
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
    await markCache(sym, "failed");
    throw new TickerNotFoundError(sym);
  }

  const closes = quotes.map((q) => q.close as number);
  const volumes = quotes.map((q) => q.volume as number);
  const ind = computeIndicators(closes, volumes);

  const db = await getDb();
  await db.run(`DELETE FROM prices WHERE ticker = ${sqlLit(sym)}`);
  await db.run(`DELETE FROM indicators WHERE ticker = ${sqlLit(sym)}`);

  const priceValuesSql = quotes
    .map((q) => {
      const d = sqlLit(isoDate(q.date));
      const adj = q.adjclose ?? q.close;
      return `(${sqlLit(sym)}, ${d}, ${q.open}, ${q.high}, ${q.low}, ${q.close}, ${adj}, ${q.volume})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO prices (ticker, date, open, high, low, close, adj_close, volume) VALUES\n${priceValuesSql}`,
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
      return `(${sqlLit(sym)}, ${d}, ${cols.join(", ")})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO indicators (ticker, date, rsi_14, sma_20, sma_50, sma_200, macd, macd_signal, macd_cross_up, bb_lower, pct_from_52w_low, volume_avg_20) VALUES\n${indicatorValuesSql}`,
  );

  await markCache(sym, "ok");
}
