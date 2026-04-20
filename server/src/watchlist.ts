import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const WATCHLIST_PATH = resolve(
  process.env.WATCHLIST_PATH ?? "./data/watchlist.json",
);

export const DEFAULT_WATCHLIST: string[] = ["AAPL", "TSLA", "HOOD"];

interface WatchlistFile {
  tickers: string[];
}

function ensureDir(): void {
  const dir = dirname(WATCHLIST_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function write(tickers: string[]): void {
  ensureDir();
  const payload: WatchlistFile = { tickers };
  writeFileSync(WATCHLIST_PATH, JSON.stringify(payload, null, 2));
}

function normalizeTicker(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toUpperCase();
  if (!s) return null;
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s) ? s : null;
}

function parse(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new WatchlistError("watchlist file malformed: not an object");
  }
  const list = (parsed as { tickers?: unknown }).tickers;
  if (!Array.isArray(list)) {
    throw new WatchlistError("watchlist file malformed: tickers not an array");
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const t = normalizeTicker(item);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function loadWatchlist(): string[] {
  ensureDir();
  if (!existsSync(WATCHLIST_PATH)) {
    write(DEFAULT_WATCHLIST);
    return [...DEFAULT_WATCHLIST];
  }
  try {
    return parse(readFileSync(WATCHLIST_PATH, "utf8"));
  } catch (err) {
    console.warn(
      `[watchlist] failed to load (${String(err)}); resetting to defaults`,
    );
    write(DEFAULT_WATCHLIST);
    return [...DEFAULT_WATCHLIST];
  }
}

export function addToWatchlist(ticker: string): {
  tickers: string[];
  added: boolean;
  ticker: string;
} {
  const sym = normalizeTicker(ticker);
  if (!sym) throw new WatchlistError(`invalid ticker: ${String(ticker)}`);
  const current = loadWatchlist();
  if (current.includes(sym)) {
    return { tickers: current, added: false, ticker: sym };
  }
  const next = [...current, sym];
  write(next);
  return { tickers: next, added: true, ticker: sym };
}

export function removeFromWatchlist(ticker: string): {
  tickers: string[];
  removed: boolean;
  ticker: string;
} {
  const sym = normalizeTicker(ticker);
  if (!sym) throw new WatchlistError(`invalid ticker: ${String(ticker)}`);
  const current = loadWatchlist();
  if (!current.includes(sym)) {
    return { tickers: current, removed: false, ticker: sym };
  }
  const next = current.filter((t) => t !== sym);
  write(next);
  return { tickers: next, removed: true, ticker: sym };
}

export class WatchlistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchlistError";
  }
}
