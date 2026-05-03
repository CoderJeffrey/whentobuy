import "dotenv/config";

import { isEightPmEt, nowEt } from "../lib/time.js";
import { sendDailyNewsletter } from "../services/newsletter.js";

const FORCE = process.argv.includes("--force") || process.env.FORCE === "true";

async function main(): Promise<void> {
  const now = nowEt();
  if (!FORCE && !isEightPmEt(now)) {
    console.log(
      `[newsletter-cron] skipping — currently ${now.toFormat("HH:mm")} ET, not 20:00`,
    );
    process.exit(0);
  }

  console.log(`[newsletter-cron] starting run at ${now.toISO()}`);
  await sendDailyNewsletter();
  console.log("[newsletter-cron] complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("[newsletter-cron] failed:", err);
  process.exit(1);
});
