import "dotenv/config";

import { nowEt } from "../lib/time.js";
import { parseSymbol } from "../lib/symbol.js";
import { ensureTickerData } from "../services/backfill.js";
import { sendDailyNewsletter } from "../services/newsletter.js";
import { listSubscribers } from "../services/preferences.js";
import { loadWatchlist } from "../watchlist.js";

async function refreshPricesForSubscribers(): Promise<void> {
  const subscribers = await listSubscribers();
  const tickers = new Set<string>();
  for (const s of subscribers) {
    const list = await loadWatchlist(s.userId);
    for (const t of list) tickers.add(t);
  }
  console.log(
    `[newsletter-cron] refreshing ${tickers.size} ticker(s) before send`,
  );
  for (const t of tickers) {
    const parsed = parseSymbol(t);
    if (!parsed) continue;
    try {
      await ensureTickerData(parsed.ticker, parsed.exchange, { force: true });
    } catch (err) {
      console.warn(`[newsletter-cron] refresh failed for ${t}:`, err);
    }
  }
}

async function main(): Promise<void> {
  const now = nowEt();
  console.log(`[newsletter-cron] starting run at ${now.toISO()}`);
  await refreshPricesForSubscribers();
  await sendDailyNewsletter();
  console.log("[newsletter-cron] complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("[newsletter-cron] failed:", err);
  process.exit(1);
});
