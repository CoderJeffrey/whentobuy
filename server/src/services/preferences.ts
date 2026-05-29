import { getSupabaseAdmin } from "../supabase.js";

export type Language = "en" | "zh";

export interface UserPreferences {
  userId: string;
  newsletterEnabled: boolean;
  unsubscribeToken: string;
  timeZone: string;
  language: Language;
}

const DEFAULT_TIME_ZONE = "America/New_York";
const DEFAULT_LANGUAGE: Language = "en";

/** Validate a supported UI language code. */
export function isValidLanguage(lang: unknown): lang is Language {
  return lang === "en" || lang === "zh";
}

/** Validate an IANA time-zone identifier (e.g. "America/New_York"). */
export function isValidTimeZone(tz: string): boolean {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
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
  time_zone: string | null;
  language: string | null;
}

const SELECT_COLS =
  "user_id, newsletter_enabled, unsubscribe_token, time_zone, language";

function fromRow(row: PreferencesRow): UserPreferences {
  return {
    userId: row.user_id,
    newsletterEnabled: row.newsletter_enabled,
    unsubscribeToken: row.unsubscribe_token,
    timeZone: row.time_zone ?? DEFAULT_TIME_ZONE,
    language: isValidLanguage(row.language) ? row.language : DEFAULT_LANGUAGE,
  };
}

export async function getPreferences(
  userId: string,
): Promise<UserPreferences> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_preferences")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new PreferencesError(`failed to read preferences: ${error.message}`);
  }
  if (data) return fromRow(data as PreferencesRow);

  const { data: inserted, error: insertError } = await getSupabaseAdmin()
    .from("user_preferences")
    .insert({ user_id: userId, newsletter_enabled: false })
    .select(SELECT_COLS)
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
    .select(SELECT_COLS)
    .single();
  if (error) {
    throw new PreferencesError(
      `failed to update preferences: ${error.message}`,
    );
  }
  return fromRow(data as PreferencesRow);
}

export async function setTimeZone(
  userId: string,
  timeZone: string,
): Promise<UserPreferences> {
  if (!isValidTimeZone(timeZone)) {
    throw new PreferencesError(`invalid time zone: ${timeZone}`);
  }
  await getPreferences(userId);
  const { data, error } = await getSupabaseAdmin()
    .from("user_preferences")
    .update({ time_zone: timeZone, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select(SELECT_COLS)
    .single();
  if (error) {
    throw new PreferencesError(
      `failed to update time zone: ${error.message}`,
    );
  }
  return fromRow(data as PreferencesRow);
}

export async function setLanguage(
  userId: string,
  language: Language,
): Promise<UserPreferences> {
  if (!isValidLanguage(language)) {
    throw new PreferencesError(`invalid language: ${language}`);
  }
  await getPreferences(userId);
  const { data, error } = await getSupabaseAdmin()
    .from("user_preferences")
    .update({ language, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select(SELECT_COLS)
    .single();
  if (error) {
    throw new PreferencesError(
      `failed to update language: ${error.message}`,
    );
  }
  return fromRow(data as PreferencesRow);
}

/**
 * Permanently delete a user's auth record. Foreign keys on user_preferences,
 * combos, watchlists, indicator library, and email_log all cascade from
 * auth.users(id), so removing the auth user wipes their data with it.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (error) {
    throw new PreferencesError(`failed to delete account: ${error.message}`);
  }
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
