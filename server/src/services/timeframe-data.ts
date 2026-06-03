import { getDb } from "../db.js";
import { buildEvalContext, type EvalContext } from "../eval-context.js";
import {
  TIMEFRAMES,
  type PriceBar,
  type PriceChart,
  type PriceRow,
  type SmaPoint,
  type Timeframe,
  type TimeframeSeries,
} from "../types.js";

const PRICE_TABLES: Record<Timeframe, string> = {
  daily: "prices",
  weekly: "prices_weekly",
  monthly: "prices_monthly",
};

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

export interface TimeframeData {
  ctx: EvalContext;
  bars: PriceBar[];
  sma200: SmaPoint[];
}

/** Per-timeframe view; `null` when that timeframe has no stored bars. */
export type TimeframeMap = Record<Timeframe, TimeframeData | null>;

async function loadPriceRows(
  tf: Timeframe,
  ticker: string,
  exchange: string,
): Promise<PriceRow[]> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT date, open, high, low, close, volume FROM ${PRICE_TABLES[tf]}
     WHERE ticker = ${sqlLit(ticker)} AND exchange = ${sqlLit(exchange)}
     ORDER BY date ASC`,
  );
  return reader.getRowObjectsJS().map((r) => ({
    date: toIsoDate(r.date),
    open: asNumber(r.open),
    high: asNumber(r.high),
    low: asNumber(r.low),
    close: asNumber(r.close),
    volume: asNumber(r.volume),
  }));
}

/**
 * Load bars and build an EvalContext for every timeframe that has data. Daily
 * is the only one guaranteed present (it's the lazy-backfill gate); weekly and
 * monthly may be `null` while their background backfill is still in flight or
 * after a Yahoo coverage gap.
 */
export async function loadTimeframeData(
  ticker: string,
  exchange: string,
): Promise<TimeframeMap> {
  const out = {} as TimeframeMap;
  for (const tf of TIMEFRAMES) {
    const rows = await loadPriceRows(tf, ticker, exchange);
    if (rows.length === 0) {
      out[tf] = null;
      continue;
    }
    const ctx = buildEvalContext(rows);
    const bars: PriceBar[] = rows.map((r) => ({
      date: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));
    const sma200: SmaPoint[] = ctx.sma200
      .map((v, i) => (v == null ? null : { date: rows[i]!.date, value: v }))
      .filter((p): p is SmaPoint => p != null);
    out[tf] = { ctx, bars, sma200 };
  }
  return out;
}

export function ctxByTimeframe(
  data: TimeframeMap,
): Record<Timeframe, EvalContext | null> {
  return {
    daily: data.daily?.ctx ?? null,
    weekly: data.weekly?.ctx ?? null,
    monthly: data.monthly?.ctx ?? null,
  };
}

function series(d: TimeframeData | null): TimeframeSeries {
  return d ? { bars: d.bars, sma200: d.sma200 } : { bars: [], sma200: [] };
}

export function toPriceChart(data: TimeframeMap): PriceChart {
  return {
    daily: series(data.daily),
    weekly: series(data.weekly),
    monthly: series(data.monthly),
  };
}
