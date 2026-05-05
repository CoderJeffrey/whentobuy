# IndicatorHub

Bare-bones v0 prototype: fetches 3 years of AAPL daily prices, computes RSI-14, SMA-200 and MACD, and displays a dashboard with a weighted "buy / hold / sell" rating.

## Stack

- Server: Node 20+, Express, TypeScript, DuckDB, `yahoo-finance2`, `technicalindicators`
- Web: Vite + React 18 + TypeScript, Tailwind v4, TanStack Query, TradingView Lightweight Charts

## First-time setup

```sh
# install server deps and seed the database (runs once)
cd server
npm install
npm run backfill

# install web deps
cd ../web
npm install
```

## Run locally

Open two terminals:

```sh
# Terminal 1 — API on http://localhost:3001
cd server
npm run dev
```

```sh
# Terminal 2 — UI on http://localhost:5173
cd web
npm run dev
```

Then open http://localhost:5173.

## Refreshing data

`npm run backfill` is idempotent — it wipes `prices` and `indicators` and re-pulls 3 years of AAPL. Re-run it whenever you want the latest bars.

## Newsletter

The daily watchlist digest is sent via Resend (configured in `server/.env`: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`).

To send a test version of the email to any address — using real data from your local dev user's watchlist:

```sh
cd server
npm run send-test-email -- --to jeffrey.jl.liu@gmail.com
```

Multiple recipients (comma-separated):

```sh
npm run send-test-email -- --to addr1@example.com,addr2@example.com
```

Subject is prefixed with `[TEST]` so it won't be confused with real 9 PM ET sends. Bypasses the time-of-day check; sends immediately. Use it for design iteration on `server/src/emails/DailyDigest.tsx`.

## Project layout

```
server/
  src/
    index.ts        # Express app + GET /api/dashboard
    db.ts           # DuckDB connection + schema
    indicators.ts   # RSI-14, SMA-200, MACD computation
    scoring.ts      # Rating logic
    types.ts
  scripts/
    backfill.ts     # One-shot Yahoo Finance fetch
  data/             # DuckDB file (gitignored)

web/
  src/
    App.tsx
    components/
      ScoreCard.tsx
      RatingBadge.tsx
      BreakdownCard.tsx
      IndicatorRow.tsx
      PriceChart.tsx
    lib/api.ts
    types.ts
    index.css       # Design tokens + Tailwind v4
```

## Scoring

```
RSI-14 < 30             → +10 pts  (high importance)
Close > SMA-200         → +5  pts  (medium)
MACD bullish cross (3d) → +2  pts  (low)

Max = 17

≥80%  strong_buy
≥60%  weak_buy
≥40%  hold
≥20%  weak_sell
<20%  immediate_sell
```
