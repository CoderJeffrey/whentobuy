import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the server environment",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isDevAutoLogin(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTO_LOGIN === "true"
  );
}

export function devUserId(): string {
  return process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";
}

export function devUserEmail(): string {
  return process.env.DEV_USER_EMAIL ?? "dev@local.test";
}
