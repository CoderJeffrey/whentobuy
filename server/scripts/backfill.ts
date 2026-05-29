import "dotenv/config";
import { closeDb } from "../src/db.js";
import { ensureTickerData } from "../src/services/backfill.js";
import { ensureSecuritiesLoaded } from "../src/services/securities.js";
import { parseSymbol } from "../src/lib/symbol.js";

const TICKERS = process.argv.slice(2);
const SYMBOLS = TICKERS.length > 0 ? TICKERS : ["AAPL.US"];

async function main(): Promise<void> {
  await ensureSecuritiesLoaded();
  for (const raw of SYMBOLS) {
    const parsed = parseSymbol(raw);
    if (!parsed) {
      console.warn(`[backfill] skipping invalid symbol: ${raw}`);
      continue;
    }
    const label = `${parsed.ticker}.${parsed.exchange}`;
    console.log(`[backfill] ${label}…`);
    await ensureTickerData(parsed.ticker, parsed.exchange, { force: true });
    console.log(`[backfill] ${label} done`);
  }
  await closeDb();
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
