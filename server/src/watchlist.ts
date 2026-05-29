import { formatSymbol, parseSymbol } from "./lib/symbol.js";
import { getSupabaseAdmin } from "./supabase.js";

export const DEFAULT_WATCHLIST: string[] = [
  "AAPL.US",
  "TSLA.US",
  "HOOD.US",
  "BE.US",
];

// Normalize any input to a qualified symbol (TICKER.EXCHANGE). Legacy bare
// tickers like "AAPL" parse as US and become "AAPL.US" — this migrates old
// watchlist rows on read.
function normalizeTicker(input: unknown): string | null {
  const parsed = parseSymbol(input);
  return parsed ? formatSymbol(parsed.ticker, parsed.exchange) : null;
}

function dedupe(tickers: unknown): string[] {
  if (!Array.isArray(tickers)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of tickers) {
    const t = normalizeTicker(item);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

async function readRow(userId: string): Promise<string[] | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_watchlists")
    .select("tickers")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new WatchlistError(`failed to read watchlist: ${error.message}`);
  }
  if (!data) return null;
  return dedupe(data.tickers);
}

async function writeRow(userId: string, tickers: string[]): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("user_watchlists")
    .upsert(
      {
        user_id: userId,
        tickers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    throw new WatchlistError(`failed to save watchlist: ${error.message}`);
  }
}

export async function loadWatchlist(userId: string): Promise<string[]> {
  const existing = await readRow(userId);
  if (existing) return existing;
  const seeded = [...DEFAULT_WATCHLIST];
  await writeRow(userId, seeded);
  return seeded;
}

export async function addToWatchlist(
  userId: string,
  ticker: string,
): Promise<{ tickers: string[]; added: boolean; ticker: string }> {
  const sym = normalizeTicker(ticker);
  if (!sym) throw new WatchlistError(`invalid ticker: ${String(ticker)}`);
  const current = await loadWatchlist(userId);
  if (current.includes(sym)) {
    return { tickers: current, added: false, ticker: sym };
  }
  const next = [...current, sym];
  await writeRow(userId, next);
  return { tickers: next, added: true, ticker: sym };
}

export async function removeFromWatchlist(
  userId: string,
  ticker: string,
): Promise<{ tickers: string[]; removed: boolean; ticker: string }> {
  const sym = normalizeTicker(ticker);
  if (!sym) throw new WatchlistError(`invalid ticker: ${String(ticker)}`);
  const current = await loadWatchlist(userId);
  if (!current.includes(sym)) {
    return { tickers: current, removed: false, ticker: sym };
  }
  const next = current.filter((t) => t !== sym);
  await writeRow(userId, next);
  return { tickers: next, removed: true, ticker: sym };
}

export class WatchlistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchlistError";
  }
}
