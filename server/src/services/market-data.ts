import YahooFinance from "yahoo-finance2";
import { getDb } from "../db.js";
import { nowEt } from "../lib/time.js";
import type { MarketData } from "../types.js";

const yahooFinance = new YahooFinance();
yahooFinance._notices.suppress(["yahooSurvey", "ripHistorical"]);

function todayDateString(): string {
  return nowEt().toISODate() ?? new Date().toISOString().slice(0, 10);
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function num(v: number | null | undefined): string {
  return v == null ? "NULL" : String(v);
}

// Module-level same-day cache (single-server deployment).
let cache: { date: string; data: MarketData | null } | null = null;

async function fetchVix(): Promise<number> {
  // Use the proven chart() path (^VIX can misbehave with quote()).
  const period2 = new Date();
  const period1 = new Date();
  period1.setDate(period1.getDate() - 7);
  const chart = await yahooFinance.chart("^VIX", {
    period1,
    period2,
    interval: "1d",
    return: "array",
  });
  const closes = chart.quotes
    .map((q) => q.close)
    .filter((c): c is number => c != null);
  const last = closes[closes.length - 1];
  if (last == null) throw new Error("VIX chart returned no closes");
  return last;
}

async function fetchFearGreed(): Promise<{ value: number; rating: string }> {
  const today = todayDateString();
  const url = `https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${today}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`CNN F&G fetch failed: ${res.status}`);
  const data = (await res.json()) as {
    fear_and_greed?: { score?: number; rating?: string };
  };
  const current = data.fear_and_greed;
  if (current?.score == null || current.rating == null) {
    throw new Error("CNN F&G response missing fear_and_greed.score/rating");
  }
  return { value: Math.round(current.score), rating: current.rating };
}

async function readMarketRow(date: string): Promise<MarketData | null> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT date, vix, fng_value, fng_rating FROM market_data WHERE date = ${sqlLit(date)}`,
  );
  return mapRow(reader.getRowObjectsJS()[0]);
}

async function readLatestMarketRow(): Promise<MarketData | null> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT date, vix, fng_value, fng_rating FROM market_data ORDER BY date DESC LIMIT 1`,
  );
  return mapRow(reader.getRowObjectsJS()[0]);
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  if (value && typeof value === "object" && "days" in (value as object)) {
    const days = Number((value as { days: number }).days);
    return new Date(days * 86400_000).toISOString().slice(0, 10);
  }
  return String(value);
}

function mapRow(row: Record<string, unknown> | undefined): MarketData | null {
  if (!row) return null;
  return {
    date: toIsoDate(row.date),
    vix: row.vix == null ? null : Number(row.vix),
    fngValue: row.fng_value == null ? null : Number(row.fng_value),
    fngRating: row.fng_rating == null ? null : String(row.fng_rating),
  };
}

async function upsertMarketData(
  date: string,
  vix: number | null,
  fngValue: number | null,
  fngRating: string | null,
): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO market_data (date, vix, fng_value, fng_rating, fetched_at)
     VALUES (${sqlLit(date)}, ${num(vix)}, ${num(fngValue)}, ${
       fngRating == null ? "NULL" : sqlLit(fngRating)
     }, now())
     ON CONFLICT (date) DO UPDATE
       SET vix = excluded.vix,
           fng_value = excluded.fng_value,
           fng_rating = excluded.fng_rating,
           fetched_at = now()`,
  );
}

async function refreshMarketData(): Promise<void> {
  const today = todayDateString();
  const prev = await readLatestMarketRow();

  // Keep the previous value for whichever source fails.
  let vix = prev?.vix ?? null;
  let fngValue = prev?.fngValue ?? null;
  let fngRating = prev?.fngRating ?? null;

  try {
    vix = await fetchVix();
  } catch (e) {
    console.error("[market-data] VIX fetch failed:", e);
  }

  try {
    const fng = await fetchFearGreed();
    fngValue = fng.value;
    fngRating = fng.rating;
  } catch (e) {
    console.error("[market-data] F&G fetch failed:", e);
  }

  await upsertMarketData(today, vix, fngValue, fngRating);
}

export async function getTodayMarketData(): Promise<MarketData | null> {
  const today = todayDateString();
  if (cache?.date === today) return cache.data;

  let row = await readMarketRow(today);
  if (!row) {
    await refreshMarketData();
    row = (await readMarketRow(today)) ?? (await readLatestMarketRow());
  }
  cache = { date: today, data: row };
  return row;
}
