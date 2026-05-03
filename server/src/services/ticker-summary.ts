import { loadConfig } from "../config.js";
import { getDb } from "../db.js";
import { scoreDashboard } from "../scoring.js";
import type {
  IndicatorRow,
  PriceRow,
  Rating,
  Score,
} from "../types.js";
import { getSecurity } from "./securities.js";

export interface TickerSummary {
  ticker: string;
  name: string;
  dataReady: boolean;
  currentPrice?: number;
  priceChange?: number;
  priceChangePct?: number;
  rating?: Rating;
  percentage?: number;
  triggeredCount?: number;
  totalCount?: number;
  score?: Score;
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

function asNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  return asNumber(v);
}

function asNullableBoolean(v: unknown): boolean | null {
  if (v == null) return null;
  return Boolean(v);
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
     ORDER BY date DESC
     LIMIT 2`,
  );
  const priceRows = priceReader.getRowObjectsJS();
  if (priceRows.length === 0) return { ticker, name, dataReady: false };

  const latest = priceRows[0]!;
  const prev = priceRows[1];
  const latestClose = asNumber(latest.close);
  const priceChange = prev ? latestClose - asNumber(prev.close) : 0;
  const priceChangePct = prev
    ? (priceChange / asNumber(prev.close)) * 100
    : 0;

  const indicatorReader = await db.runAndReadAll(
    `SELECT date, rsi_14, sma_20, sma_50, sma_200, macd, macd_signal, macd_cross_up, bb_lower, pct_from_52w_low, volume_avg_20
     FROM indicators WHERE ticker = ${sqlLit(ticker)} ORDER BY date ASC`,
  );
  const indicatorRows = indicatorReader.getRowObjectsJS();
  if (indicatorRows.length === 0) {
    return {
      ticker,
      name,
      dataReady: true,
      currentPrice: Number(latestClose.toFixed(2)),
      priceChange: Number(priceChange.toFixed(2)),
      priceChangePct: Number(priceChangePct.toFixed(2)),
      asOf: toIsoDate(latest.date),
    };
  }

  const indicators: IndicatorRow[] = indicatorRows.map((r) => ({
    date: toIsoDate(r.date),
    rsi_14: asNullableNumber(r.rsi_14),
    sma_20: asNullableNumber(r.sma_20),
    sma_50: asNullableNumber(r.sma_50),
    sma_200: asNullableNumber(r.sma_200),
    macd: asNullableNumber(r.macd),
    macd_signal: asNullableNumber(r.macd_signal),
    macd_cross_up: asNullableBoolean(r.macd_cross_up),
    bb_lower: asNullableNumber(r.bb_lower),
    pct_from_52w_low: asNullableNumber(r.pct_from_52w_low),
    volume_avg_20: asNullableNumber(r.volume_avg_20),
  }));

  const latestIndicator = indicators[indicators.length - 1]!;
  const latestPriceRow: PriceRow = {
    date: toIsoDate(latest.date),
    open: asNumber(latest.open),
    high: asNumber(latest.high),
    low: asNumber(latest.low),
    close: latestClose,
    volume: asNumber(latest.volume),
  };

  const { weights } = await loadConfig(userId);
  const score = scoreDashboard(
    latestPriceRow,
    latestIndicator,
    indicators,
    weights,
  );

  return {
    ticker,
    name,
    dataReady: true,
    currentPrice: Number(latestClose.toFixed(2)),
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    rating: score.rating,
    percentage: score.percentage,
    triggeredCount: score.triggeredCount,
    totalCount: score.totalCount,
    score,
    asOf: toIsoDate(latest.date),
  };
}
