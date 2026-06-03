# Architecture

IndicatorHub ("whentobuy") is a stock-signal dashboard. A user builds **combos**
— named AND-groups of technical indicators — and watches a list of tickers light
up "green" when every indicator in a combo currently fires. A daily job refreshes
prices and emails subscribers a digest of which watchlist tickers turned green.

This document describes how the system is put together. The root `README.md` covers
local setup and run commands; this file covers structure and data flow.

## Monorepo layout

```
whentobuy/
  server/        # Express + TypeScript API, DuckDB price store, cron job, emails
  web/           # Vite + React 19 SPA
  scripts/       # repo-level helper scripts
  package.json   # top-level build/start that drives both web and server
```

Top-level `npm run build` builds the web bundle then installs server deps;
`npm run start` runs the server, which in production also serves the built SPA.

## Two data stores, by design

The system deliberately splits persistence across two stores:

- **Supabase (Postgres)** — the system of record for *user-scoped* data: auth
  users, `user_preferences`, `user_indicator_library`, `combos`, `combo_indicators`,
  and `email_log`. Every user table has Row-Level Security keyed on `auth.uid()`.
  The server talks to it with the **service-role key** (`server/src/supabase.ts`),
  bypassing RLS, so it must enforce per-user scoping itself by always filtering on
  `user_id`. Schema lives in `server/migrations/*.sql`, applied manually in the
  Supabase SQL editor (they are not auto-run).

- **DuckDB (local file)** — the cache for *market data*: `securities`, `prices`,
  `indicators`, and `ticker_cache`. Created/migrated on first connection in
  `server/src/db.ts` at `server/data/app.db` (gitignored). This file is the reason
  the daily cron runs *in-process* rather than as a separate service — a Railway
  volume attaches to only one service.

  Prices and indicators exist at three **timeframes** (Part 27): the daily tables
  above plus `prices_weekly` / `indicators_weekly` and `prices_monthly` /
  `indicators_monthly` (identical shapes, ~1/5 and ~1/20 the rows). `ticker_cache`
  tracks freshness *per timeframe* — its PK is `(ticker, exchange, timeframe)` — so
  a weekly coverage gap (common for A-shares) doesn't poison the daily cache.

There is no ORM. Postgres access goes through the Supabase JS client; DuckDB access
is hand-written SQL strings (note `sqlLit()` helpers for escaping — there is no
parameter binding on the DuckDB path).

## Server (`server/src`)

Entry point `index.ts` wires up Express and defines every route inline. Notable
structure:

- **Boot sequence** — `app.listen()` opens the port *first* (so Railway's health
  check passes immediately), then `bootstrap()` runs DB migration + securities load
  in the background, then arms the daily job. In dev-auto-login mode it also warms
  the dev user's watchlist by kicking off backfills.
- **Auth** — `middleware/auth.ts` `requireAuth` is mounted on `app.use("/api", …)`,
  so everything under `/api` is authenticated *except* the routes registered before
  it (`/api/health`, `/api/unsubscribe`). It verifies the `Bearer` token via Supabase
  and attaches `req.user`. In development with `DEV_AUTO_LOGIN=true` it short-circuits
  to a fixed dev user (`supabase.ts: devUserId()`), so you can run with no real auth.
  On every authed request it lazily ensures the user has a seeded indicator library
  and at least one combo.

### Indicator system (the core domain)

This is the heart of the app and spans three files:

- **`eval-context.ts`** — `buildEvalContext(prices)` takes the full OHLCV history
  and computes *every* indicator series once (RSI, MACD, SMAs/EMAs, Bollinger,
  Stochastic, ADX, candlestick patterns, etc.) into a single `EvalContext` object,
  with `i` pointing at the latest bar. Heavy lifting uses the `technicalindicators`
  package.
- **`indicator-registry.ts`** — `REGISTRY`, an array of `IndicatorDef`s. Each entry
  has metadata (`id`, `label`, `abbreviation`, `category`, `description`) plus a pure
  `evaluate(ctx) => { triggered, displayValue }`. This is the single source of truth
  for what indicators exist. `INDICATOR_METADATA` (metadata only) is what the API
  exposes; `isIndicatorId()` validates IDs coming from clients. `supportedTimeframes`
  is derived from category — `market` indicators (VIX, F&G) are daily-only, everything
  else supports daily/weekly/monthly.
- **`services/timeframe-data.ts`** — `loadTimeframeData(ticker, exchange)` loads bars
  and builds an `EvalContext` (plus chart bars + SMA-200) for each timeframe that has
  stored prices. Note: combo evaluation is built from the `prices*` tables on every
  request, *not* from the precomputed `indicators*` tables — those are written during
  backfill but are not read on the eval path.
- **`indicators.ts`** — lower-level raw indicator computation used to persist the
  `indicators` table during backfill.

**To add an indicator:** add any needed series to `EvalContext` in `eval-context.ts`,
then add one `IndicatorDef` to `REGISTRY`. No DB migration is needed — indicator IDs
are just strings stored in `combo_indicators` / `user_indicator_library`.

### Combos & watchlist (services)

`services/combos.ts` is the user-facing layer over the registry. A **combo** is a
named set of indicator instances, each pinned to a timeframe (`{ indicatorId, timeframe }`,
max 5 combos/user, `MAX_COMBOS_PER_USER`). The same indicator may appear at multiple
timeframes in one combo. `evaluateCombos(combos, ctxByTimeframe)` resolves each indicator
against the `EvalContext` for its timeframe; a combo is `green` only when *all* its
indicators trigger (boolean AND). If a timeframe has no data, that indicator reports
"Data unavailable" and the combo can't go green. New users are seeded with a default
combo ("Oversold + Uptrend", all daily).

`watchlist.ts` + `services/indicator-library.ts` + `services/preferences.ts` are thin
Supabase-backed CRUD services for the per-user watchlist, the indicator "library"
(marketplace add/remove), and newsletter/timezone preferences.

`services/securities.ts` loads the ticker→name universe (SEC ticker list); `services/backfill.ts`
fetches price history from Yahoo Finance (`yahoo-finance2`), computes indicators, and
upserts into DuckDB. `ensureTickerData()` is the lazy-load gate: it **blocks on the daily
fetch** so the page renders fast, then kicks weekly + monthly (`1wk`/`1mo` intervals) in
the background with a small delay and an in-flight dedupe guard. Failures are isolated
per timeframe and recorded in `ticker_cache`. `services/ticker-summary.ts` and
`services/name-normalize.ts` are supporting helpers.

### Daily job & email

`cron/scheduler.ts` arms a self-re-arming `setTimeout` (not a fixed interval, so DST
stays aligned) targeting an ET hour/minute. Gated by `DAILY_JOB_ENABLED`. On fire it
`refreshAllCachedTickers()` then `sendDailyNewsletter()` (`services/newsletter.ts`),
which renders `emails/DailyDigest.tsx` (a React Email component) and sends via Resend,
logging each send to `email_log`. `cron/newsletter.ts` is the standalone CLI entry.
All time logic flows through `lib/time.ts` (Luxon, `America/New_York`).

### Request flow example — `GET /api/dashboard?ticker=AAPL`

1. `requireAuth` resolves `req.user`.
2. `buildDashboard()` sanitizes the ticker, calls `ensureTickerData()` (lazy backfill).
3. `loadTimeframeData()` reads prices from DuckDB and builds an `EvalContext` per timeframe.
4. Loads the user's combos from Supabase and runs `evaluateCombos()` across timeframes.
5. Returns `DashboardResponse`: daily price history + SMA-200, a `priceChart` with all three
   timeframe series, and per-combo green status (each indicator tagged with its timeframe).

## Web (`web/src`)

Vite + React 19 SPA, Tailwind v4, TanStack Query (with localStorage persistence),
TradingView Lightweight Charts, React Router v7.

- **`App.tsx`** — routing. Public routes (`/`, `/login`, `/unsubscribe`) sit outside
  auth; everything else goes through `ProtectedRoutes`, which redirects unauthenticated
  users to `/login` and renders the authed pages inside `layouts/AppLayout.tsx`.
- **`contexts/AuthContext.tsx`** — Supabase auth session state (`useAuth()`).
- **`lib/api.ts`** — typed fetch wrapper. `fetchWithAuth()` attaches the Supabase
  access token as a `Bearer` header; errors are normalized into `ApiError` with a
  shared `ApiErrorCode`.
- **`lib/supabase.ts` / `lib/devAuth.ts`** — client-side Supabase client and dev-mode
  auth bypass mirroring the server's dev-login.
- **`pages/`** — `Dashboard`, `Indicators` (marketplace/library), `Mail`, `Settings`,
  `Login`, `Landing`, `Unsubscribe`. **`hooks/useWatchlist.ts`** holds the watchlist
  query/mutation logic. **`components/`** are the UI building blocks (watchlist,
  combo editor modal, price chart, search bar, sidebar, etc.).

### Shared types

`server/src/types.ts` and `web/src/types.ts` are **kept in sync by hand** — they
define the same API contract (`DashboardResponse`, `Combo`, `WatchlistItem`, …). The
web copy adds the client-side `ApiError` class. When you change an API shape, edit
both.

## Conventions & gotchas

- **Two type files, one contract** — keep `server/src/types.ts` and `web/src/types.ts`
  aligned.
- **Manual migrations** — adding a Postgres table means writing a new
  `server/migrations/NN_*.sql` *and* running it in Supabase by hand (they run in
  numeric order; e.g. `18_combos.sql` must precede `21_combo_timeframe.sql`). DuckDB
  schema changes go in `db.ts:migrate()` and apply automatically on next boot.
- **Service-role key bypasses RLS** — server code is responsible for `user_id` scoping;
  RLS only protects direct client access.
- **DuckDB SQL is string-built** — use the `sqlLit()` helpers; never interpolate raw
  user input.
- **Indicators are pure functions over `EvalContext`** — keep `evaluate()` side-effect
  free; all series precomputed in `eval-context.ts`.
- **Dev mode** — `DEV_AUTO_LOGIN=true` (dev only; the server refuses to boot if it's
  set in production) gives a fixed local user with no Supabase auth round-trip.
- **The cron lives in the web process** on purpose (single-volume DuckDB constraint).
