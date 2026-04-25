import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (
  import.meta.env.PROD &&
  (import.meta.env.VITE_DEV_AUTO_LOGIN as string | undefined) === "true"
) {
  throw new Error(
    "VITE_DEV_AUTO_LOGIN must not be true in production builds.",
  );
}

if (!url || !anonKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing; auth calls will fail until set.",
  );
}

export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
