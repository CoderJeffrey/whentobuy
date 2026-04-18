import "dotenv/config";
import cors from "cors";
import express from "express";
import { getDb } from "./db.js";
import { scoreDashboard } from "./scoring.js";
import type {
  DashboardResponse,
  IndicatorRow,
  PriceBar,
  SmaPoint,
} from "./types.js";

const PORT = Number(process.env.PORT ?? 3001);

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

async function buildDashboard(): Promise<DashboardResponse> {
  const db = await getDb();

  const priceReader = await db.runAndReadAll(
    "SELECT date, open, high, low, close, adj_close, volume FROM prices ORDER BY date ASC",
  );
  const priceRows = priceReader.getRowObjectsJS();

  if (priceRows.length === 0) {
    throw new Error("no price data — run `npm run backfill` first");
  }

  const indicatorReader = await db.runAndReadAll(
    "SELECT date, rsi_14, sma_200, macd, macd_signal, macd_cross_up FROM indicators ORDER BY date ASC",
  );
  const indicatorRows = indicatorReader.getRowObjectsJS();

  const priceHistory: PriceBar[] = priceRows.map((r) => ({
    date: toIsoDate(r.date),
    open: asNumber(r.open),
    high: asNumber(r.high),
    low: asNumber(r.low),
    close: asNumber(r.close),
    volume: asNumber(r.volume),
  }));

  const indicators: IndicatorRow[] = indicatorRows.map((r) => ({
    date: toIsoDate(r.date),
    rsi_14: asNullableNumber(r.rsi_14),
    sma_200: asNullableNumber(r.sma_200),
    macd: asNullableNumber(r.macd),
    macd_signal: asNullableNumber(r.macd_signal),
    macd_cross_up: asNullableBoolean(r.macd_cross_up),
  }));

  const latest = priceHistory[priceHistory.length - 1]!;
  const prev = priceHistory[priceHistory.length - 2];
  const latestIndicator = indicators[indicators.length - 1]!;

  const priceChange = prev ? latest.close - prev.close : 0;
  const priceChangePct = prev ? (priceChange / prev.close) * 100 : 0;

  const sma200Series: SmaPoint[] = indicators
    .filter((r): r is IndicatorRow & { sma_200: number } => r.sma_200 != null)
    .map((r) => ({ date: r.date, value: r.sma_200 }));

  const score = scoreDashboard(latest.close, latestIndicator, indicators);

  return {
    ticker: "AAPL",
    asOf: latest.date,
    currentPrice: latest.close,
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    score,
    priceHistory,
    sma200Series,
  };
}

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/dashboard", async (_req, res) => {
  try {
    const payload = await buildDashboard();
    res.json(payload);
  } catch (err) {
    console.error("[/api/dashboard] error:", err);
    const message = err instanceof Error ? err.message : "internal error";
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
