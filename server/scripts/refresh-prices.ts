import "dotenv/config";
import { closeDb, getDb } from "../src/db.js";
import { ensureTickerData } from "../src/services/backfill.js";
import { ensureSecuritiesLoaded } from "../src/services/securities.js";

async function main(): Promise<void> {
  await ensureSecuritiesLoaded();
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT DISTINCT ticker FROM ticker_cache`,
  );
  const tickers = reader.getRowObjectsJS().map((r) => String(r.ticker));
  console.log(`[refresh-prices] refreshing ${tickers.length} ticker(s)`);

  let ok = 0;
  let failed = 0;
  for (const t of tickers) {
    try {
      await ensureTickerData(t, { force: true });
      ok += 1;
      console.log(`[refresh-prices] ${t} ok`);
    } catch (err) {
      failed += 1;
      console.warn(`[refresh-prices] ${t} failed:`, err);
    }
  }

  console.log(`[refresh-prices] complete: ${ok} ok, ${failed} failed`);
  await closeDb();
}

main().catch((err) => {
  console.error("[refresh-prices] fatal:", err);
  process.exit(1);
});
