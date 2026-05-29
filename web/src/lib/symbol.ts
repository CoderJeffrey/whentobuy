export type Exchange = "US" | "SS" | "SZ";

const EXCHANGES = new Set<string>(["US", "SS", "SZ"]);

export interface ParsedSymbol {
  ticker: string;
  exchange: Exchange;
}

/**
 * Parse a qualified symbol (`AAPL.US`, `600519.SS`, `BRK.B.US`) into ticker +
 * exchange. Splits on the last dot only when the suffix is a known exchange,
 * so bare/legacy tickers default to US. Mirrors the server's parseSymbol.
 */
export function parseSymbol(input: string): ParsedSymbol {
  const s = String(input ?? "").trim().toUpperCase();
  let ticker = s;
  let exchange: Exchange = "US";
  const idx = s.lastIndexOf(".");
  if (idx > 0 && idx < s.length - 1) {
    const suffix = s.slice(idx + 1);
    if (EXCHANGES.has(suffix)) {
      ticker = s.slice(0, idx);
      exchange = suffix as Exchange;
    }
  }
  return { ticker, exchange };
}

// All helpers tolerate missing fields: stale persisted cache (or any pre-v21
// API payload) can lack ticker/exchange/currency, and rendering must never
// hard-crash on an undefined value. Default to the US/USD interpretation.
export function formatSymbol(ticker: string, exchange: string): string {
  return `${String(ticker ?? "").toUpperCase()}.${String(exchange ?? "US").toUpperCase()}`;
}

export function currencyFor(exchange: string): "USD" | "CNY" {
  return String(exchange ?? "US").toUpperCase() === "US" ? "USD" : "CNY";
}

export function formatPrice(value: number, currency: string): string {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${Number(value ?? 0).toFixed(2)}`;
}

/** Short market badge shown next to a ticker: "US" or "CN". */
export function marketBadge(exchange: string): "US" | "CN" {
  return String(exchange ?? "US").toUpperCase() === "US" ? "US" : "CN";
}
