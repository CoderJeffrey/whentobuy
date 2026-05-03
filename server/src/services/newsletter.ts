import { render } from "@react-email/render";
import { Resend } from "resend";
import { createElement } from "react";
import {
  DailyDigest,
  type EmailTickerData,
} from "../emails/DailyDigest.js";
import { formatLongDateEt } from "../lib/time.js";
import { logEmail } from "./email-log.js";
import { listSubscribers, type SubscriberRecord } from "./preferences.js";
import { getTickerSummary } from "./ticker-summary.js";
import { loadWatchlist } from "../watchlist.js";

const BATCH_SIZE = 10;
const MAX_TICKERS_PER_EMAIL = 10;

let cachedResend: Resend | null = null;
function getResend(): Resend {
  if (cachedResend) return cachedResend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  cachedResend = new Resend(key);
  return cachedResend;
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function getSubjectLine(tickers: EmailTickerData[]): string {
  const buyCount = tickers.filter(
    (t) => t.rating === "strong_buy" || t.rating === "weak_buy",
  ).length;
  if (buyCount === 0) return "Your daily watchlist update";
  if (buyCount === 1) return "1 stock in your watchlist looks favorable";
  return `${buyCount} stocks in your watchlist look favorable`;
}

async function buildTickerData(
  userId: string,
): Promise<EmailTickerData[]> {
  const watchlist = await loadWatchlist(userId);
  const limited = watchlist.slice(0, MAX_TICKERS_PER_EMAIL);
  const summaries = await Promise.all(
    limited.map((t) => getTickerSummary(userId, t).catch((err) => {
      console.warn(`[newsletter] summary failed for ${t}:`, err);
      return null;
    })),
  );
  const out: EmailTickerData[] = [];
  for (const s of summaries) {
    if (
      !s ||
      !s.dataReady ||
      s.currentPrice == null ||
      s.priceChange == null ||
      s.priceChangePct == null ||
      s.percentage == null ||
      s.rating == null ||
      s.triggeredCount == null ||
      s.totalCount == null
    ) {
      continue;
    }
    out.push({
      ticker: s.ticker,
      name: s.name,
      currentPrice: s.currentPrice,
      priceChange: s.priceChange,
      priceChangePct: s.priceChangePct,
      percentage: s.percentage,
      rating: s.rating,
      triggeredCount: s.triggeredCount,
      totalCount: s.totalCount,
    });
  }
  return out;
}

async function sendOne(
  subscriber: SubscriberRecord,
  appUrl: string,
  emailFrom: string,
): Promise<void> {
  const tickers = await buildTickerData(subscriber.userId);
  if (tickers.length === 0) {
    console.log(
      `[newsletter] skipping ${subscriber.email} — empty/un-ready watchlist`,
    );
    return;
  }

  const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
  const html = await render(
    createElement(DailyDigest, {
      tickers,
      unsubscribeUrl,
      appUrl,
      dateLabel: formatLongDateEt(),
    }),
  );

  try {
    const result = await getResend().emails.send({
      from: emailFrom,
      to: subscriber.email,
      subject: getSubjectLine(tickers),
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    await logEmail(subscriber.userId, "sent", result.data?.id ?? null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[newsletter] send failed for ${subscriber.email}:`, message);
    await logEmail(subscriber.userId, "failed", null, message);
  }
}

export async function sendDailyNewsletter(): Promise<void> {
  const appUrl = getEnv("APP_URL");
  const emailFrom = getEnv("EMAIL_FROM");
  // Validate Resend up-front so we fail fast instead of per-user.
  getResend();

  const subscribers = await listSubscribers();
  console.log(`[newsletter] ${subscribers.length} subscriber(s)`);

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((s) => sendOne(s, appUrl, emailFrom)));
  }
}

export async function sendNewsletterToUser(userId: string): Promise<void> {
  const appUrl = getEnv("APP_URL");
  const emailFrom = getEnv("EMAIL_FROM");
  getResend();
  const subscribers = await listSubscribers();
  const subscriber = subscribers.find((s) => s.userId === userId);
  if (!subscriber) {
    throw new Error(`user ${userId} is not a subscriber`);
  }
  await sendOne(subscriber, appUrl, emailFrom);
}
