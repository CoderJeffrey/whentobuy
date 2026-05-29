export type Exchange = "US" | "SS" | "SZ";

const EXCHANGES = new Set<string>(["US", "SS", "SZ"]);

export interface ParsedSymbol {
  ticker: string;
  exchange: Exchange;
}

/**
 * Parse a qualified symbol (`AAPL.US`, `600519.SS`, `BRK.B.US`) into its ticker
 * and exchange. Splits on the LAST dot, but only treats the suffix as an
 * exchange when it is a known one — so legacy bare tickers (`AAPL`) and US
 * class shares stored with a dot (`BRK.B`) still parse, defaulting to `US`.
 * Returns null for input that isn't a usable ticker.
 */
export function parseSymbol(input: unknown): ParsedSymbol | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toUpperCase();
  if (!s) return null;

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

  if (!/^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(ticker)) return null;
  return { ticker, exchange };
}

/** Build the canonical qualified symbol stored in watchlists and URLs. */
export function formatSymbol(ticker: string, exchange: string): string {
  return `${ticker.toUpperCase()}.${exchange.toUpperCase()}`;
}

export function currencyFor(exchange: string): "USD" | "CNY" {
  return exchange.toUpperCase() === "US" ? "USD" : "CNY";
}
