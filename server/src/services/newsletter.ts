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
export function getResendClient(): Resend {
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
    (t) => t.dataReady && (t.rating === "strong_buy" || t.rating === "weak_buy"),
  ).length;
  if (buyCount === 0) return "Your daily watchlist update";
  if (buyCount === 1) return "1 stock in your watchlist looks favorable";
  return `${buyCount} stocks in your watchlist look favorable`;
}

export interface BuiltTickerData {
  tickers: EmailTickerData[];
  watchlistTotal: number;
}

export async function buildEmailTickerData(
  userId: string,
): Promise<BuiltTickerData> {
  const watchlist = await loadWatchlist(userId);
  const limited = watchlist.slice(0, MAX_TICKERS_PER_EMAIL);
  const summaries = await Promise.all(
    limited.map((t) =>
      getTickerSummary(userId, t).catch((err) => {
        console.warn(`[newsletter] summary failed for ${t}:`, err);
        return { ticker: t, name: t, dataReady: false as const };
      }),
    ),
  );

  const tickers = summaries.map((s): EmailTickerData => {
    if (
      s.dataReady &&
      s.currentPrice != null &&
      s.priceChange != null &&
      s.priceChangePct != null &&
      s.percentage != null &&
      s.rating != null &&
      s.score != null
    ) {
      return {
        ticker: s.ticker,
        name: s.name,
        dataReady: true,
        currentPrice: s.currentPrice,
        priceChange: s.priceChange,
        priceChangePct: s.priceChangePct,
        percentage: s.percentage,
        rating: s.rating,
        scoreTotal: s.score.total,
        scoreMax: s.score.max,
      };
    }
    return { ticker: s.ticker, name: s.name, dataReady: false };
  });

  return { tickers, watchlistTotal: watchlist.length };
}

export interface RenderDailyDigestArgs {
  tickers: EmailTickerData[];
  unsubscribeUrl: string;
  appUrl: string;
  watchlistTotal?: number;
  dateLabel?: string;
}

export async function renderDailyDigestHtml(
  args: RenderDailyDigestArgs,
): Promise<string> {
  return render(
    createElement(DailyDigest, {
      tickers: args.tickers,
      unsubscribeUrl: args.unsubscribeUrl,
      appUrl: args.appUrl,
      watchlistTotal: args.watchlistTotal,
      dateLabel: args.dateLabel ?? formatLongDateEt(),
    }),
  );
}

async function sendOne(
  subscriber: SubscriberRecord,
  appUrl: string,
  emailFrom: string,
): Promise<void> {
  const { tickers, watchlistTotal } = await buildEmailTickerData(
    subscriber.userId,
  );
  if (tickers.length === 0) {
    console.log(
      `[newsletter] skipping ${subscriber.email} — empty watchlist`,
    );
    return;
  }

  const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
  const html = await renderDailyDigestHtml({
    tickers,
    unsubscribeUrl,
    appUrl,
    watchlistTotal,
  });

  try {
    const result = await getResendClient().emails.send({
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
  getResendClient();

  const subscribers = await listSubscribers();
  console.log(`[newsletter] ${subscribers.length} subscriber(s)`);
  for (const s of subscribers) {
    if (s.email === "jeffrey.jl.liu@gmail.com") {
      console.log(`[newsletter] subscriber match: ${s.email} (${s.userId})`);
    }
  }

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((s) => sendOne(s, appUrl, emailFrom)));
  }
}

export async function sendNewsletterToUser(userId: string): Promise<void> {
  const appUrl = getEnv("APP_URL");
  const emailFrom = getEnv("EMAIL_FROM");
  getResendClient();
  const subscribers = await listSubscribers();
  const subscriber = subscribers.find((s) => s.userId === userId);
  if (!subscriber) {
    throw new Error(`user ${userId} is not a subscriber`);
  }
  await sendOne(subscriber, appUrl, emailFrom);
}
