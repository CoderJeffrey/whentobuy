import "dotenv/config";

import {
  buildEmailTickerData,
  getResendClient,
  renderDailyDigestHtml,
} from "../src/services/newsletter.js";
import { devUserId } from "../src/supabase.js";

interface CliArgs {
  to?: string;
  user?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i]!;
    if (!cur.startsWith("--")) continue;
    const key = cur.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith("--") ? next : "";
    if (key === "to" || key === "user") {
      args[key] = value;
    }
    if (value) i++;
  }
  return args;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.to) {
    fail("Usage: npm run send-test-email -- --to <email>[,<email>,...]");
  }

  const recipients = args.to
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (recipients.length === 0) {
    fail("No recipients parsed from --to argument");
  }
  for (const r of recipients) {
    if (!EMAIL_RE.test(r)) {
      fail(`Invalid email address: ${r}`);
    }
  }

  if (!process.env.RESEND_API_KEY) {
    fail("Add RESEND_API_KEY to your .env file");
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail(
      "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file",
    );
  }

  const userId = args.user ?? process.env.DEV_USER_ID ?? devUserId();
  const appUrl = process.env.APP_URL ?? "http://localhost:5173";
  const emailFrom =
    process.env.EMAIL_FROM ?? "IndicatorHub <onboarding@resend.dev>";

  console.log(`Loading watchlist for user ${userId}…`);
  const { tickers, watchlistTotal } = await buildEmailTickerData(userId);
  if (tickers.length === 0) {
    fail(
      "Dev user has no watchlist. Add tickers first (use the app, or POST /api/watchlist).",
    );
  }

  const readyCount = tickers.filter((t) => t.dataReady).length;
  console.log(
    `Loaded ${tickers.length} of ${watchlistTotal} watchlist ticker(s) (${readyCount} with data, ${tickers.length - readyCount} placeholder).`,
  );

  const html = await renderDailyDigestHtml({
    tickers,
    unsubscribeUrl: `${appUrl}/unsubscribe?token=test-token`,
    appUrl,
    watchlistTotal,
  });

  console.log(`Sending test email to ${recipients.join(", ")}…`);
  const resend = getResendClient();
  const result = await resend.emails.send({
    from: emailFrom,
    to: recipients,
    subject: "[TEST] Your daily watchlist update",
    html,
  });

  if (result.error) {
    fail(`Resend error: ${result.error.message}`);
  }

  const id = result.data?.id ?? "(no id)";
  console.log(`✓ Sent. Resend ID: ${id}`);
  console.log(`  Check inbox for ${recipients.join(", ")}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
