import { isIndicatorId } from "../indicator-registry.js";
import { getSupabaseAdmin } from "../supabase.js";
import type { IndicatorId } from "../types.js";

export const DEFAULT_LIBRARY: IndicatorId[] = [
  "rsi_oversold",
  "above_ema_200",
  "above_sma_200",
];

const initialized = new Set<string>();

export class LibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LibraryError";
  }
}

export async function ensureUserLibraryInitialized(
  userId: string,
): Promise<void> {
  if (initialized.has(userId)) return;
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("user_indicator_library")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.warn(
      `[library] init check failed for ${userId}: ${error.message}`,
    );
    return;
  }
  if ((count ?? 0) === 0) {
    const { error: insertError } = await supabase
      .from("user_indicator_library")
      .insert(
        DEFAULT_LIBRARY.map((indicator_id) => ({
          user_id: userId,
          indicator_id,
        })),
      );
    if (insertError) {
      console.warn(
        `[library] default seed failed for ${userId}: ${insertError.message}`,
      );
      return;
    }
  }
  initialized.add(userId);
}

export async function listLibrary(userId: string): Promise<IndicatorId[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_indicator_library")
    .select("indicator_id")
    .eq("user_id", userId);
  if (error) {
    throw new LibraryError(`failed to list library: ${error.message}`);
  }
  return (data ?? []).map((r) => r.indicator_id as IndicatorId);
}

export async function addToLibrary(
  userId: string,
  indicatorId: string,
): Promise<void> {
  if (!isIndicatorId(indicatorId)) {
    throw new LibraryError(`unknown indicator id: ${indicatorId}`);
  }
  const { error } = await getSupabaseAdmin()
    .from("user_indicator_library")
    .upsert(
      { user_id: userId, indicator_id: indicatorId },
      { onConflict: "user_id,indicator_id", ignoreDuplicates: true },
    );
  if (error) {
    throw new LibraryError(`failed to add to library: ${error.message}`);
  }
}

export async function removeFromLibrary(
  userId: string,
  indicatorId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("user_indicator_library")
    .delete()
    .eq("user_id", userId)
    .eq("indicator_id", indicatorId);
  if (error) {
    throw new LibraryError(`failed to remove from library: ${error.message}`);
  }
}
