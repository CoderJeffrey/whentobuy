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
import { buildEvalContext } from "./eval-context.js";
import { startDailyJob } from "./cron/scheduler.js";
import { requireAuth, type AuthedRequest } from "./middleware/auth.js";
import {
  addIndicatorToCombo,
  ComboError,
  createCombo,
  deleteCombo,
  evaluateCombos,
  listCombos,
  removeIndicatorFromCombo,
  updateCombo,
} from "./services/combos.js";
import { ensureDevUser, migrateDevUserJsonFiles } from "./services/dev-user.js";
import {
  addToLibrary,
  LibraryError,
  listLibrary,
  removeFromLibrary,
} from "./services/indicator-library.js";
import { devUserId, isDevAutoLogin } from "./supabase.js";
import { getDb } from "./db.js";
import { INDICATOR_METADATA, isIndicatorId } from "./indicator-registry.js";
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
import { currencyFor, formatSymbol, parseSymbol } from "./lib/symbol.js";
import type {
  DashboardResponse,
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
import {
  deleteUserAccount,
  findByUnsubscribeToken,
  getPreferences,
  isValidLanguage,
  isValidTimeZone,
  setLanguage,
  setNewsletterEnabled,
  setTimeZone,
  type Language,
} from "./services/preferences.js";

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

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function buildDashboard(
  userId: string,
  symbolInput: string,
): Promise<DashboardResponse> {
  const parsed = parseSymbol(symbolInput);
  if (!parsed) throw new TickerNotFoundError(String(symbolInput));
  const { ticker, exchange } = parsed;
  const symbol = formatSymbol(ticker, exchange);
  await ensureTickerData(ticker, exchange);

  const db = await getDb();
  const security = await getSecurity(ticker, exchange);

  const priceReader = await db.runAndReadAll(
    `SELECT date, open, high, low, close, adj_close, volume FROM prices WHERE ticker = ${sqlLit(ticker)} AND exchange = ${sqlLit(exchange)} ORDER BY date ASC`,
  );
  const priceRows = priceReader.getRowObjectsJS();

  if (priceRows.length === 0) {
    throw new TickerNotFoundError(ticker);
  }

  const priceHistory: PriceBar[] = priceRows.map((r) => ({
    date: toIsoDate(r.date),
    open: asNumber(r.open),
    high: asNumber(r.high),
    low: asNumber(r.low),
    close: asNumber(r.close),
    volume: asNumber(r.volume),
  }));

  const latest = priceHistory[priceHistory.length - 1]!;
  const prev = priceHistory[priceHistory.length - 2];

  const priceChange = prev ? latest.close - prev.close : 0;
  const priceChangePct = prev ? (priceChange / prev.close) * 100 : 0;

  const priceRowsForCtx: PriceRow[] = priceHistory.map((p) => ({
    date: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
  }));
  const ctx = buildEvalContext(priceRowsForCtx);

  const sma200Series: SmaPoint[] = ctx.sma200
    .map((v, i) =>
      v == null ? null : { date: priceHistory[i]!.date, value: v },
    )
    .filter((p): p is SmaPoint => p != null);

  const combos = await listCombos(userId);
  const comboStatuses = await evaluateCombos(combos, ctx);
  const anyGreen = comboStatuses.some((c) => c.green);

  return {
    ticker,
    exchange,
    symbol,
    market: security?.market ?? (exchange === "US" ? "us" : "china"),
    currency: currencyFor(exchange),
    name: security?.name ?? ticker,
    asOf: latest.date,
    currentPrice: latest.close,
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    combos: comboStatuses,
    anyGreen,
    priceHistory,
    sma200Series,
  };
}

async function isTickerDataReady(
  ticker: string,
  exchange: string,
): Promise<boolean> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT status FROM ticker_cache WHERE ticker = ${sqlLit(ticker)} AND exchange = ${sqlLit(exchange)}`,
  );
  const rows = reader.getRowObjectsJS();
  return rows.length > 0 && rows[0]!.status === "ok";
}

async function getWatchlistDisplayItem(
  userId: string,
  symbolInput: string,
  totalCombos: number,
  combosForUser: Awaited<ReturnType<typeof listCombos>>,
): Promise<WatchlistDisplayItem> {
  const parsed = parseSymbol(symbolInput);
  const ticker = parsed?.ticker ?? symbolInput.toUpperCase();
  const exchange = parsed?.exchange ?? "US";
  const symbol = formatSymbol(ticker, exchange);
  const currency = currencyFor(exchange);
  const security = await getSecurity(ticker, exchange);
  const name = security?.name ?? ticker;
  const market = security?.market ?? (exchange === "US" ? "us" : "china");
  const base = { symbol, ticker, exchange, market, currency, name };

  const ready = await isTickerDataReady(ticker, exchange);
  if (!ready) {
    return { ...base, dataReady: false, totalCombos };
  }

  const db = await getDb();
  const priceReader = await db.runAndReadAll(
    `SELECT date, open, high, low, close, volume FROM prices
     WHERE ticker = ${sqlLit(ticker)} AND exchange = ${sqlLit(exchange)}
     ORDER BY date ASC`,
  );
  const priceRows = priceReader.getRowObjectsJS();
  if (priceRows.length === 0) {
    return { ...base, dataReady: false, totalCombos };
  }

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
  const priceChangePct = prev
    ? ((latest.close - prev.close) / prev.close) * 100
    : 0;

  const ctx = buildEvalContext(prices);
  const statuses = await evaluateCombos(combosForUser, ctx);
  const greenComboCount = statuses.filter((s) => s.green).length;

  return {
    ...base,
    dataReady: true,
    currentPrice: Number(latest.close.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    greenComboCount,
    totalCombos,
  };
}

function kickBackfill(symbolInput: string): void {
  const parsed = parseSymbol(symbolInput);
  if (!parsed) return;
  ensureTickerData(parsed.ticker, parsed.exchange).catch((err) => {
    console.warn(`[watchlist] backfill ${symbolInput} failed:`, err);
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

function sendComboError(res: express.Response, err: unknown): boolean {
  if (err instanceof ComboError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return true;
  }
  return false;
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

async function handleUnsubscribe(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "missing token" });
    return;
  }
  try {
    const pref = await findByUnsubscribeToken(token);
    if (!pref) {
      res.status(404).json({ error: "invalid token" });
      return;
    }
    if (pref.newsletterEnabled) {
      await setNewsletterEnabled(pref.userId, false);
    }
    res.json({ ok: true, unsubscribed: true });
  } catch (err) {
    console.error("[/api/unsubscribe] error:", err);
    res.status(500).json({ error: "failed to unsubscribe" });
  }
}

app.get("/api/unsubscribe", handleUnsubscribe);
app.post("/api/unsubscribe", handleUnsubscribe);

app.use("/api", requireAuth);

app.get("/api/me", (req: AuthedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: req.user.id, email: req.user.email });
});

app.get("/api/dashboard", async (req: AuthedRequest, res) => {
  const symbolParam =
    typeof req.query.symbol === "string"
      ? req.query.symbol
      : typeof req.query.ticker === "string"
        ? req.query.ticker
        : "AAPL.US";
  try {
    const payload = await buildDashboard(req.user!.id, symbolParam);
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
    const parsed = parseSymbol(req.params.ticker);
    if (!parsed) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const sec = await getSecurity(parsed.ticker, parsed.exchange);
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

app.get("/api/indicators/marketplace", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.json(INDICATOR_METADATA);
});

app.get("/api/indicators/library", async (req: AuthedRequest, res) => {
  try {
    const ids = new Set(await listLibrary(req.user!.id));
    const items = INDICATOR_METADATA.filter((m) => ids.has(m.id));
    res.json(items);
  } catch (err) {
    console.error("[/api/indicators/library GET] error:", err);
    res.status(500).json({ error: "failed to load library" });
  }
});

app.post("/api/indicators/library", async (req: AuthedRequest, res) => {
  try {
    const raw = (req.body as { indicator_id?: unknown })?.indicator_id;
    if (typeof raw !== "string" || !isIndicatorId(raw)) {
      res.status(400).json({ error: "invalid indicator_id" });
      return;
    }
    await addToLibrary(req.user!.id, raw);
    res.json({ ok: true, indicator_id: raw });
  } catch (err) {
    if (err instanceof LibraryError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[/api/indicators/library POST] error:", err);
    res.status(500).json({ error: "failed to add to library" });
  }
});

app.delete("/api/indicators/library/:id", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "missing id" });
      return;
    }
    await removeFromLibrary(req.user!.id, id);
    res.json({ ok: true, indicator_id: id });
  } catch (err) {
    if (err instanceof LibraryError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[/api/indicators/library DELETE] error:", err);
    res.status(500).json({ error: "failed to remove from library" });
  }
});

app.get("/api/combos", async (req: AuthedRequest, res) => {
  try {
    const combos = await listCombos(req.user!.id);
    res.json({ combos });
  } catch (err) {
    if (sendComboError(res, err)) return;
    console.error("[/api/combos GET] error:", err);
    res.status(500).json({ error: "failed to load combos" });
  }
});

app.post("/api/combos", async (req: AuthedRequest, res) => {
  try {
    const body = (req.body ?? {}) as { name?: unknown; indicatorIds?: unknown };
    const combo = await createCombo(req.user!.id, {
      name: body.name,
      indicatorIds: body.indicatorIds,
    });
    res.json({ combo });
  } catch (err) {
    if (sendComboError(res, err)) return;
    console.error("[/api/combos POST] error:", err);
    res.status(500).json({ error: "failed to create combo" });
  }
});

app.patch("/api/combos/:id", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    const body = (req.body ?? {}) as { name?: unknown; indicatorIds?: unknown };
    const combo = await updateCombo(req.user!.id, id, body);
    res.json({ combo });
  } catch (err) {
    if (sendComboError(res, err)) return;
    console.error("[/api/combos PATCH] error:", err);
    res.status(500).json({ error: "failed to update combo" });
  }
});

app.delete("/api/combos/:id", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    await deleteCombo(req.user!.id, id);
    res.json({ ok: true });
  } catch (err) {
    if (sendComboError(res, err)) return;
    console.error("[/api/combos DELETE] error:", err);
    res.status(500).json({ error: "failed to delete combo" });
  }
});

app.post("/api/combos/:id/indicators", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    const body = (req.body ?? {}) as { indicatorId?: unknown };
    const combo = await addIndicatorToCombo(req.user!.id, id, body.indicatorId);
    res.json({ combo });
  } catch (err) {
    if (sendComboError(res, err)) return;
    console.error("[/api/combos/:id/indicators POST] error:", err);
    res.status(500).json({ error: "failed to add indicator" });
  }
});

app.delete(
  "/api/combos/:id/indicators/:indId",
  async (req: AuthedRequest, res) => {
    try {
      const id = req.params.id;
      const indId = req.params.indId;
      if (!id || !indId) {
        res.status(400).json({ error: "missing id" });
        return;
      }
      const combo = await removeIndicatorFromCombo(req.user!.id, id, indId);
      res.json({ combo });
    } catch (err) {
      if (sendComboError(res, err)) return;
      console.error("[/api/combos/:id/indicators DELETE] error:", err);
      res.status(500).json({ error: "failed to remove indicator" });
    }
  },
);

app.get("/api/watchlist", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const [tickers, combosForUser] = await Promise.all([
      loadWatchlist(userId),
      listCombos(userId),
    ]);
    const totalCombos = combosForUser.length;
    const items = await Promise.all(
      tickers.map((t) =>
        getWatchlistDisplayItem(userId, t, totalCombos, combosForUser),
      ),
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
    const parsed = parseSymbol(raw);
    if (!parsed) {
      throw new TickerNotFoundError(String(raw));
    }
    const sym = formatSymbol(parsed.ticker, parsed.exchange);
    const security = await getSecurity(parsed.ticker, parsed.exchange);
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
    const combosForUser = await listCombos(userId);
    const totalCombos = combosForUser.length;
    const items = await Promise.all(
      result.tickers.map((t) =>
        getWatchlistDisplayItem(userId, t, totalCombos, combosForUser),
      ),
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
    const parsed = parseSymbol(req.params.ticker);
    if (!parsed) {
      throw new TickerNotFoundError(String(req.params.ticker));
    }
    const sym = formatSymbol(parsed.ticker, parsed.exchange);
    const result = await removeFromWatchlist(userId, sym);
    const combosForUser = await listCombos(userId);
    const totalCombos = combosForUser.length;
    const items = await Promise.all(
      result.tickers.map((t) =>
        getWatchlistDisplayItem(userId, t, totalCombos, combosForUser),
      ),
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

function prefsView(prefs: {
  newsletterEnabled: boolean;
  timeZone: string;
  language: Language;
}) {
  return {
    newsletter_enabled: prefs.newsletterEnabled,
    time_zone: prefs.timeZone,
    language: prefs.language,
  };
}

app.get("/api/preferences", async (req: AuthedRequest, res) => {
  try {
    const prefs = await getPreferences(req.user!.id);
    res.json(prefsView(prefs));
  } catch (err) {
    console.error("[/api/preferences GET] error:", err);
    res.status(500).json({ error: "failed to load preferences" });
  }
});

app.put("/api/preferences", async (req: AuthedRequest, res) => {
  try {
    const body = req.body as {
      newsletter_enabled?: unknown;
      time_zone?: unknown;
      language?: unknown;
    };
    const hasNewsletter = body?.newsletter_enabled !== undefined;
    const hasTimeZone = body?.time_zone !== undefined;
    const hasLanguage = body?.language !== undefined;

    if (!hasNewsletter && !hasTimeZone && !hasLanguage) {
      res
        .status(400)
        .json({ error: "newsletter_enabled, time_zone, or language is required" });
      return;
    }
    if (hasNewsletter && typeof body.newsletter_enabled !== "boolean") {
      res.status(400).json({ error: "newsletter_enabled must be a boolean" });
      return;
    }
    if (
      hasTimeZone &&
      (typeof body.time_zone !== "string" || !isValidTimeZone(body.time_zone))
    ) {
      res.status(400).json({ error: "time_zone must be a valid IANA zone" });
      return;
    }
    if (hasLanguage && !isValidLanguage(body.language)) {
      res.status(400).json({ error: "language must be 'en' or 'zh'" });
      return;
    }

    const userId = req.user!.id;
    let prefs = await getPreferences(userId);
    if (hasNewsletter) {
      prefs = await setNewsletterEnabled(
        userId,
        body.newsletter_enabled as boolean,
      );
    }
    if (hasTimeZone) {
      prefs = await setTimeZone(userId, body.time_zone as string);
    }
    if (hasLanguage) {
      prefs = await setLanguage(userId, body.language as Language);
    }
    res.json(prefsView(prefs));
  } catch (err) {
    console.error("[/api/preferences PUT] error:", err);
    res.status(500).json({ error: "failed to save preferences" });
  }
});

app.delete("/api/account", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    if (isDevAutoLogin() && userId === devUserId()) {
      res
        .status(403)
        .json({ error: "the dev user account cannot be deleted" });
      return;
    }
    await deleteUserAccount(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[/api/account DELETE] error:", err);
    res.status(500).json({ error: "failed to delete account" });
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

// Open the port first so Railway's healthcheck passes immediately, then warm
// up (DB migrations, securities, dev backfills) in the background.
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  bootstrap()
    .then(() => startDailyJob())
    .catch((err) => {
      console.error("[bootstrap] failed:", err);
    });
});
