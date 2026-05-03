import { getSupabaseAdmin } from "../supabase.js";

export interface UserPreferences {
  userId: string;
  newsletterEnabled: boolean;
  unsubscribeToken: string;
}

export class PreferencesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreferencesError";
  }
}

interface PreferencesRow {
  user_id: string;
  newsletter_enabled: boolean;
  unsubscribe_token: string;
}

function fromRow(row: PreferencesRow): UserPreferences {
  return {
    userId: row.user_id,
    newsletterEnabled: row.newsletter_enabled,
    unsubscribeToken: row.unsubscribe_token,
  };
}

export async function getPreferences(
  userId: string,
): Promise<UserPreferences> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_preferences")
    .select("user_id, newsletter_enabled, unsubscribe_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new PreferencesError(`failed to read preferences: ${error.message}`);
  }
  if (data) return fromRow(data as PreferencesRow);

  const { data: inserted, error: insertError } = await getSupabaseAdmin()
    .from("user_preferences")
    .insert({ user_id: userId, newsletter_enabled: false })
    .select("user_id, newsletter_enabled, unsubscribe_token")
    .single();
  if (insertError) {
    throw new PreferencesError(
      `failed to seed preferences: ${insertError.message}`,
    );
  }
  return fromRow(inserted as PreferencesRow);
}

export async function setNewsletterEnabled(
  userId: string,
  enabled: boolean,
): Promise<UserPreferences> {
  await getPreferences(userId);
  const { data, error } = await getSupabaseAdmin()
    .from("user_preferences")
    .update({
      newsletter_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id, newsletter_enabled, unsubscribe_token")
    .single();
  if (error) {
    throw new PreferencesError(
      `failed to update preferences: ${error.message}`,
    );
  }
  return fromRow(data as PreferencesRow);
}

export async function findByUnsubscribeToken(
  token: string,
): Promise<UserPreferences | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_preferences")
    .select("user_id, newsletter_enabled, unsubscribe_token")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error) {
    throw new PreferencesError(`failed to look up token: ${error.message}`);
  }
  return data ? fromRow(data as PreferencesRow) : null;
}

export interface SubscriberRecord {
  userId: string;
  email: string;
  unsubscribeToken: string;
}

export async function listSubscribers(): Promise<SubscriberRecord[]> {
  const supa = getSupabaseAdmin();
  const { data: prefs, error } = await supa
    .from("user_preferences")
    .select("user_id, unsubscribe_token")
    .eq("newsletter_enabled", true);
  if (error) {
    throw new PreferencesError(`failed to list subscribers: ${error.message}`);
  }
  if (!prefs || prefs.length === 0) return [];

  const out: SubscriberRecord[] = [];
  for (const p of prefs as { user_id: string; unsubscribe_token: string }[]) {
    const { data: userResp, error: userErr } = await supa.auth.admin.getUserById(
      p.user_id,
    );
    if (userErr || !userResp?.user?.email) {
      console.warn(
        `[preferences] skipping subscriber ${p.user_id} — no email`,
        userErr?.message,
      );
      continue;
    }
    out.push({
      userId: p.user_id,
      email: userResp.user.email,
      unsubscribeToken: p.unsubscribe_token,
    });
  }
  return out;
}
