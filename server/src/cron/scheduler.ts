import { DateTime } from "luxon";
import { nowEt } from "../lib/time.js";
import { refreshAllCachedTickers } from "../services/backfill.js";
import { sendDailyNewsletter } from "../services/newsletter.js";

// In-process daily job: refresh every cached ticker, then send the digest.
// Runs inside the web service so it shares the same DuckDB volume — a separate
// Railway cron service cannot, because volumes attach to one service only.

const ZONE = "America/New_York";

function isEnabled(): boolean {
  return process.env.DAILY_JOB_ENABLED === "true";
}

function targetHourEt(): number {
  const h = Number(process.env.DAILY_JOB_HOUR_ET ?? 18);
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 18;
}

function msUntilNextRun(): number {
  const now = nowEt();
  let next = now.set({
    hour: targetHourEt(),
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (next <= now) next = next.plus({ days: 1 });
  return next.diff(now).toMillis();
}

async function runJob(): Promise<void> {
  const start = nowEt();
  console.log(`[daily-job] starting at ${start.toISO()}`);
  try {
    await refreshAllCachedTickers();
  } catch (err) {
    console.error("[daily-job] price refresh failed:", err);
  }
  try {
    await sendDailyNewsletter();
  } catch (err) {
    console.error("[daily-job] newsletter send failed:", err);
  }
  console.log("[daily-job] complete");
}

function scheduleNext(): void {
  const delay = msUntilNextRun();
  const at = DateTime.now()
    .plus({ milliseconds: delay })
    .setZone(ZONE)
    .toISO();
  console.log(
    `[daily-job] next run in ${Math.round(delay / 60000)} min (${at})`,
  );
  // Re-arm via setTimeout (not a fixed 24h interval) so DST shifts stay aligned.
  const timer = setTimeout(() => {
    void runJob().finally(scheduleNext);
  }, delay);
  timer.unref?.();
}

export function startDailyJob(): void {
  if (!isEnabled()) {
    console.log("[daily-job] disabled (set DAILY_JOB_ENABLED=true to enable)");
    return;
  }
  console.log(`[daily-job] enabled; target ${targetHourEt()}:00 ET`);
  scheduleNext();
}
