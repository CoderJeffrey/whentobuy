import { existsSync, readFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { devUserEmail, devUserId, getSupabaseAdmin } from "../supabase.js";
import { DEFAULT_CONFIG, validateConfig } from "../config.js";

const CONFIG_JSON_PATH = resolve(
  process.env.CONFIG_PATH ?? "./data/user-config.json",
);
const WATCHLIST_JSON_PATH = resolve(
  process.env.WATCHLIST_PATH ?? "./data/watchlist.json",
);

export async function ensureDevUser(): Promise<string> {
  const id = devUserId();
  const email = devUserEmail();
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin.auth.admin.getUserById(id);
  if (existing?.user) return id;

  const { error } = await admin.auth.admin.createUser({
    id,
    email,
    email_confirm: true,
    user_metadata: { dev_user: true },
  });
  if (error && !/already (registered|exists)/i.test(error.message)) {
    throw new Error(`failed to create dev user: ${error.message}`);
  }
  console.log(`[dev-user] ensured ${email} (${id}) exists in auth.users`);
  return id;
}

async function hasConfigRow(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("user_configs")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function hasWatchlistRow(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("user_watchlists")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

function backupPath(p: string): string {
  return `${p}.bak`;
}

export async function migrateDevUserJsonFiles(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  if (existsSync(CONFIG_JSON_PATH) && !(await hasConfigRow(userId))) {
    try {
      const raw = readFileSync(CONFIG_JSON_PATH, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const validated = (() => {
        try {
          return validateConfig(parsed);
        } catch {
          return DEFAULT_CONFIG;
        }
      })();
      const { error } = await admin
        .from("user_configs")
        .upsert(
          { user_id: userId, weights: validated.weights },
          { onConflict: "user_id" },
        );
      if (error) throw new Error(error.message);
      renameSync(CONFIG_JSON_PATH, backupPath(CONFIG_JSON_PATH));
      console.log("[dev-user] migrated user-config.json -> Supabase");
    } catch (err) {
      console.warn("[dev-user] config migration failed:", err);
    }
  }

  if (existsSync(WATCHLIST_JSON_PATH) && !(await hasWatchlistRow(userId))) {
    try {
      const raw = readFileSync(WATCHLIST_JSON_PATH, "utf8");
      const parsed = JSON.parse(raw) as { tickers?: unknown };
      const tickers = Array.isArray(parsed.tickers)
        ? parsed.tickers.filter((t): t is string => typeof t === "string")
        : [];
      const { error } = await admin
        .from("user_watchlists")
        .upsert({ user_id: userId, tickers }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      renameSync(WATCHLIST_JSON_PATH, backupPath(WATCHLIST_JSON_PATH));
      console.log("[dev-user] migrated watchlist.json -> Supabase");
    } catch (err) {
      console.warn("[dev-user] watchlist migration failed:", err);
    }
  }
}
