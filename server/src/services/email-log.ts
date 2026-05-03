import { getSupabaseAdmin } from "../supabase.js";

export type EmailLogStatus = "sent" | "failed";

export async function logEmail(
  userId: string,
  status: EmailLogStatus,
  resendId: string | null,
  errorMessage?: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("email_log").insert({
    user_id: userId,
    status,
    resend_id: resendId,
    error_message: errorMessage ?? null,
  });
  if (error) {
    console.warn(`[email_log] failed to record ${status}:`, error.message);
  }
}
