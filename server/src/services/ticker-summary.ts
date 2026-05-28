import { getDb } from "../db.js";
import { buildEvalContext } from "../eval-context.js";
import type { ComboStatus, PriceRow } from "../types.js";
import { evaluateCombos, listCombos } from "./combos.js";
import { getSecurity } from "./securities.js";

export interface TickerSummary {
  ticker: string;
  name: string;
  dataReady: boolean;
  currentPrice?: number;
  priceChange?: number;
  priceChangePct?: number;
  combos?: ComboStatus[];
  greenComboCount?: number;
  totalCombos?: number;
  anyGreen?: boolean;
  asOf?: string;
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  if (value && typeof value === "object" && "days" in (value as object)) {
    const days = Number((value as { days: number }).days);
    return new Date(days * 86400_000).toISOString().slice(0, 10);
  }
  throw new Error(`cannot convert to ISO date: ${String(value)}`);
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  throw new Error(`cannot convert to number: ${String(v)}`);
}

async function isReady(ticker: string): Promise<boolean> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT status FROM ticker_cache WHERE ticker = ${sqlLit(ticker)}`,
  );
  const rows = reader.getRowObjectsJS();
  return rows.length > 0 && rows[0]!.status === "ok";
}

export async function getTickerSummary(
  userId: string,
  ticker: string,
): Promise<TickerSummary> {
  const security = await getSecurity(ticker);
  const name = security?.name ?? ticker;
  const ready = await isReady(ticker);
  if (!ready) return { ticker, name, dataReady: false };

  const db = await getDb();
  const priceReader = await db.runAndReadAll(
    `SELECT date, open, high, low, close, volume FROM prices
     WHERE ticker = ${sqlLit(ticker)}
     ORDER BY date ASC`,
  );
  const priceRows = priceReader.getRowObjectsJS();
  if (priceRows.length === 0) return { ticker, name, dataReady: false };

  const prices: PriceRow[] = priceRows.map((r) => ({
    date: toIsoDate(r.date),
    open: asNumber(r.open),
    high: asNumber(r.high),
    low: asNumber(r.low),
    close: asNumber(r.close),
    volume: asNumber(r.volume),
  }));
  const latest = prices[prices.length - 1]!;
  const prev = prices[prices.length - 2];
  const priceChange = prev ? latest.close - prev.close : 0;
  const priceChangePct = prev ? (priceChange / prev.close) * 100 : 0;

  const ctx = buildEvalContext(prices);
  const combos = await listCombos(userId);
  const statuses = await evaluateCombos(combos, ctx);
  const greenComboCount = statuses.filter((s) => s.green).length;

  return {
    ticker,
    name,
    dataReady: true,
    currentPrice: Number(latest.close.toFixed(2)),
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    combos: statuses,
    greenComboCount,
    totalCombos: combos.length,
    anyGreen: greenComboCount > 0,
    asOf: latest.date,
  };
}
