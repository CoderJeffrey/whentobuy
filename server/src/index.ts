import "dotenv/config";

if (
  process.env.NODE_ENV === "production" &&
  process.env.DEV_AUTO_LOGIN === "true"
) {
  console.error(
    "FATAL: DEV_AUTO_LOGIN is true in production. Refusing to start.",
  );
  process.exit(1);
}

import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { ConfigError, loadConfig, saveConfig } from "./config.js";
import { requireAuth, type AuthedRequest } from "./middleware/auth.js";
import { ensureDevUser, migrateDevUserJsonFiles } from "./services/dev-user.js";
import { isDevAutoLogin } from "./supabase.js";
import { getDb } from "./db.js";
import { INDICATOR_METADATA } from "./indicator-registry.js";
import { scoreDashboard } from "./scoring.js";
import {
  ensureTickerData,
  NetworkError,
  RateLimitError,
  TickerNotFoundError,
} from "./services/backfill.js";
import {
  ensureSecuritiesLoaded,
  getSecurity,
  searchSecurities,
} from "./services/securities.js";
import type {
  DashboardResponse,
  IndicatorRow,
  PriceBar,
  PriceRow,
  SmaPoint,
  WatchlistItem as WatchlistDisplayItem,
  WatchlistResponse,
} from "./types.js";
import {
  addToWatchlist,
  loadWatchlist,
  removeFromWatchlist,
  WatchlistError,
} from "./watchlist.js";

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

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sanitizeTicker(input: unknown): string {
  if (typeof input !== "string") {
    throw new TickerNotFoundError(String(input));
  }
  const s = input.trim().toUpperCase();
  if (!s || !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)) {
    throw new TickerNotFoundError(s);
  }
  return s;
}

async function buildDashboard(
  userId: string,
  ticker: string,
): Promise<DashboardResponse> {
  const sym = sanitizeTicker(ticker);
  await ensureTickerData(sym);

  const db = await getDb();
  const security = await getSecurity(sym);

  const priceReader = await db.runAndReadAll(
    `SELECT date, open, high, low, close, adj_close, volume FROM prices WHERE ticker = ${sqlLit(sym)} ORDER BY date ASC`,
  );
  const priceRows = priceReader.getRowObjectsJS();

  if (priceRows.length === 0) {
    throw new TickerNotFoundError(sym);
  }

  const indicatorReader = await db.runAndReadAll(
    `SELECT date, rsi_14, sma_20, sma_50, sma_200, macd, macd_signal, macd_cross_up, bb_lower, pct_from_52w_low, volume_avg_20 FROM indicators WHERE ticker = ${sqlLit(sym)} ORDER BY date ASC`,
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

  const latest = priceHistory[priceHistory.length - 1]!;
  const prev = priceHistory[priceHistory.length - 2];
  const latestIndicator = indicators[indicators.length - 1]!;

  const priceChange = prev ? latest.close - prev.close : 0;
  const priceChangePct = prev ? (priceChange / prev.close) * 100 : 0;

  const sma200Series: SmaPoint[] = indicators
    .filter((r): r is IndicatorRow & { sma_200: number } => r.sma_200 != null)
    .map((r) => ({ date: r.date, value: r.sma_200 }));

  const latestPriceRow: PriceRow = {
    date: latest.date,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
    volume: latest.volume,
  };

  const { weights } = await loadConfig(userId);
  const score = scoreDashboard(
    latestPriceRow,
    latestIndicator,
    indicators,
    weights,
  );

  return {
    ticker: sym,
    name: security?.name ?? sym,
    asOf: latest.date,
    currentPrice: latest.close,
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    score,
    priceHistory,
    sma200Series,
  };
}

async function isTickerDataReady(ticker: string): Promise<boolean> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT status FROM ticker_cache WHERE ticker = ${sqlLit(ticker)}`,
  );
  const rows = reader.getRowObjectsJS();
  return rows.length > 0 && rows[0]!.status === "ok";
}

async function getWatchlistDisplayItem(
  userId: string,
  ticker: string,
): Promise<WatchlistDisplayItem> {
  const security = await getSecurity(ticker);
  const name = security?.name ?? ticker;
  const ready = await isTickerDataReady(ticker);
  if (!ready) {
    return { ticker, name, dataReady: false };
  }

  const db = await getDb();
  const priceReader = await db.runAndReadAll(
    `SELECT date, open, high, low, close, volume FROM prices
     WHERE ticker = ${sqlLit(ticker)}
     ORDER BY date DESC
     LIMIT 2`,
  );
  const priceRows = priceReader.getRowObjectsJS();
  if (priceRows.length === 0) {
    return { ticker, name, dataReady: false };
  }

  const latest = priceRows[0]!;
  const prev = priceRows[1];
  const latestClose = asNumber(latest.close);
  const priceChangePct = prev
    ? ((latestClose - asNumber(prev.close)) / asNumber(prev.close)) * 100
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
      priceChangePct: Number(priceChangePct.toFixed(2)),
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
    priceChangePct: Number(priceChangePct.toFixed(2)),
    rating: score.rating,
    percentage: score.percentage,
  };
}

function kickBackfill(ticker: string): void {
  ensureTickerData(ticker).catch((err) => {
    console.warn(`[watchlist] backfill ${ticker} failed:`, err);
  });
}

function sendBackfillError(res: express.Response, err: unknown): void {
  if (err instanceof TickerNotFoundError) {
    res.status(404).json({ error: err.message, code: "TICKER_NOT_FOUND" });
    return;
  }
  if (err instanceof RateLimitError) {
    res.status(429).json({ error: err.message, code: "RATE_LIMITED" });
    return;
  }
  if (err instanceof NetworkError) {
    res.status(502).json({ error: err.message, code: "NETWORK_ERROR" });
    return;
  }
  const message = err instanceof Error ? err.message : "internal error";
  console.error("[backfill] unexpected:", err);
  res.status(500).json({ error: message, code: "INTERNAL" });
}

async function bootstrap(): Promise<void> {
  await getDb();
  await ensureSecuritiesLoaded();

  if (isDevAutoLogin()) {
    try {
      const devId = await ensureDevUser();
      await migrateDevUserJsonFiles(devId);
      const watchlist = await loadWatchlist(devId);
      for (const t of watchlist) {
        kickBackfill(t);
      }
      console.log(
        `[bootstrap] dev mode: kicked backfill for ${watchlist.length} dev watchlist tickers`,
      );
    } catch (err) {
      console.warn(
        "[bootstrap] dev-user init failed (Supabase reachable?):",
        err,
      );
    }
  } else {
    console.log("[bootstrap] auth required; skipping dev-user warmup");
  }
}

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", requireAuth);

app.get("/api/me", (req: AuthedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: req.user.id, email: req.user.email });
});

app.get("/api/dashboard", async (req: AuthedRequest, res) => {
  const tickerParam =
    typeof req.query.ticker === "string" ? req.query.ticker : "AAPL";
  try {
    const payload = await buildDashboard(req.user!.id, tickerParam);
    res.json(payload);
  } catch (err) {
    if (
      err instanceof TickerNotFoundError ||
      err instanceof RateLimitError ||
      err instanceof NetworkError
    ) {
      sendBackfillError(res, err);
      return;
    }
    console.error("[/api/dashboard] error:", err);
    const message = err instanceof Error ? err.message : "internal error";
    res.status(500).json({ error: message, code: "INTERNAL" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 10;
    const results = await searchSecurities(q, Number.isFinite(limit) ? limit : 10);
    res.json(results);
  } catch (err) {
    console.error("[/api/search] error:", err);
    res.status(500).json({ error: "search failed" });
  }
});

app.get("/api/securities/:ticker", async (req, res) => {
  try {
    const sec = await getSecurity(req.params.ticker);
    if (!sec) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(sec);
  } catch (err) {
    console.error("[/api/securities] error:", err);
    res.status(500).json({ error: "lookup failed" });
  }
});

app.get("/api/indicators", (_req, res) => {
  res.json(INDICATOR_METADATA);
});

app.get("/api/config", async (req: AuthedRequest, res) => {
  try {
    res.json(await loadConfig(req.user!.id));
  } catch (err) {
    console.error("[/api/config GET] error:", err);
    res.status(500).json({ error: "failed to load config" });
  }
});

app.get("/api/watchlist", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const tickers = await loadWatchlist(userId);
    const items = await Promise.all(
      tickers.map((t) => getWatchlistDisplayItem(userId, t)),
    );
    const payload: WatchlistResponse = { tickers: items };
    res.json(payload);
  } catch (err) {
    console.error("[/api/watchlist GET] error:", err);
    res.status(500).json({ error: "failed to load watchlist" });
  }
});

app.post("/api/watchlist", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const raw = (req.body as { ticker?: unknown })?.ticker;
    const sym = sanitizeTicker(raw);
    const security = await getSecurity(sym);
    if (!security) {
      res
        .status(404)
        .json({ error: `Ticker not found: ${sym}`, code: "TICKER_NOT_FOUND" });
      return;
    }
    const result = await addToWatchlist(userId, sym);
    if (result.added) {
      kickBackfill(result.ticker);
    }
    const items = await Promise.all(
      result.tickers.map((t) => getWatchlistDisplayItem(userId, t)),
    );
    const payload: WatchlistResponse & { added: boolean } = {
      tickers: items,
      added: result.added,
    };
    res.json(payload);
  } catch (err) {
    if (err instanceof TickerNotFoundError) {
      res.status(400).json({ error: err.message, code: "TICKER_NOT_FOUND" });
      return;
    }
    if (err instanceof WatchlistError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[/api/watchlist POST] error:", err);
    res.status(500).json({ error: "failed to add to watchlist" });
  }
});

app.delete("/api/watchlist/:ticker", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const sym = sanitizeTicker(req.params.ticker);
    const result = await removeFromWatchlist(userId, sym);
    const items = await Promise.all(
      result.tickers.map((t) => getWatchlistDisplayItem(userId, t)),
    );
    const payload: WatchlistResponse & { removed: boolean } = {
      tickers: items,
      removed: result.removed,
    };
    res.json(payload);
  } catch (err) {
    if (err instanceof TickerNotFoundError) {
      res.status(400).json({ error: err.message, code: "TICKER_NOT_FOUND" });
      return;
    }
    if (err instanceof WatchlistError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[/api/watchlist DELETE] error:", err);
    res.status(500).json({ error: "failed to remove from watchlist" });
  }
});

app.put("/api/config", async (req: AuthedRequest, res) => {
  try {
    const saved = await saveConfig(req.user!.id, req.body);
    res.json(saved);
  } catch (err) {
    if (err instanceof ConfigError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[/api/config PUT] error:", err);
    res.status(500).json({ error: "failed to save config" });
  }
});

if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendPath = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(frontendPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
  console.log(`[server] serving SPA from ${frontendPath}`);
}

bootstrap()
  .catch((err) => {
    console.error("[bootstrap] failed:", err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  });
