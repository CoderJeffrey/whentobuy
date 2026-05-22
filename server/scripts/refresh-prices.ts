import "dotenv/config";
import { closeDb } from "../src/db.js";
import { refreshAllCachedTickers } from "../src/services/backfill.js";
import { ensureSecuritiesLoaded } from "../src/services/securities.js";

async function main(): Promise<void> {
  await ensureSecuritiesLoaded();
  await refreshAllCachedTickers();
  await closeDb();
}

main().catch((err) => {
  console.error("[refresh-prices] fatal:", err);
  process.exit(1);
});
