import "dotenv/config";
import { closeDb } from "../src/db.js";
import { ensureTickerData } from "../src/services/backfill.js";
import { ensureSecuritiesLoaded } from "../src/services/securities.js";

const TICKERS = process.argv.slice(2);
const SYMBOLS = TICKERS.length > 0 ? TICKERS : ["AAPL"];

async function main(): Promise<void> {
  await ensureSecuritiesLoaded();
  for (const sym of SYMBOLS) {
    console.log(`[backfill] ${sym}…`);
    await ensureTickerData(sym, { force: true });
    console.log(`[backfill] ${sym} done`);
  }
  await closeDb();
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
