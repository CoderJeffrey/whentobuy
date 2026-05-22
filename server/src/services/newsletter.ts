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
  const firingCount = tickers.filter(
    (t) => t.dataReady && t.greenCombos.length > 0,
  ).length;
  if (firingCount === 0) return "Your daily watchlist update";
  if (firingCount === 1) return "1 stock has combos firing today";
  return `${firingCount} stocks have combos firing today`;
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
      s.combos != null
    ) {
      return {
        ticker: s.ticker,
        name: s.name,
        dataReady: true,
        currentPrice: s.currentPrice,
        priceChange: s.priceChange,
        priceChangePct: s.priceChangePct,
        greenCombos: s.combos
          .filter((c) => c.green)
          .map((c) => ({ comboId: c.comboId, name: c.name })),
        totalCombos: s.totalCombos ?? s.combos.length,
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
  const isOwner = process.env.OWNER_EMAIL === subscriber.email;
  const { tickers, watchlistTotal } = await buildEmailTickerData(
    subscriber.userId,
  );
  if (tickers.length === 0) {
    console.log(
      `[newsletter] skipping ${subscriber.email} — empty watchlist`,
    );
    return;
  }

  if (isOwner) {
    console.log(
      `[newsletter] preparing send for owner ${subscriber.email}: ${tickers.length} ticker(s), watchlistTotal=${watchlistTotal}`,
    );
  }

  const subject = getSubjectLine(tickers);
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
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (isOwner) {
      console.log(
        `[newsletter] resend confirmation for owner ${subscriber.email}: id=${result.data?.id ?? "<no-id>"} subject="${subject}" from=${emailFrom}`,
      );
      console.log(
        `[newsletter] resend raw response for owner:`,
        JSON.stringify(result),
      );
    }
    await logEmail(subscriber.userId, "sent", result.data?.id ?? null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[newsletter] send failed for ${subscriber.email}:`, message);
    if (isOwner) {
      console.error(`[newsletter] owner send failure detail:`, err);
    }
    await logEmail(subscriber.userId, "failed", null, message);
  }
}

export async function sendDailyNewsletter(): Promise<void> {
  const subscribers = await listSubscribers();
  console.log(`[newsletter] ${subscribers.length} subscriber(s)`);
  if (subscribers.length === 0) {
    console.log("[newsletter] no subscribers; skipping send");
    return;
  }

  const appUrl = getEnv("APP_URL");
  const emailFrom = getEnv("EMAIL_FROM");
  getResendClient();
  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail) {
    for (const s of subscribers) {
      if (s.email === ownerEmail) {
        console.log(`[newsletter] subscriber match: ${s.email} (${s.userId})`);
      }
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
