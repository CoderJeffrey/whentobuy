import type { EvalContext } from "../eval-context.js";
import {
  INDICATOR_REGISTRY,
  isIndicatorId,
  supportedTimeframesForId,
} from "../indicator-registry.js";
import { getSupabaseAdmin } from "../supabase.js";
import { getTodayMarketData } from "./market-data.js";
import {
  TIMEFRAMES,
  type Combo,
  type ComboIndicatorRef,
  type ComboStatus,
  type IndicatorId,
  type Timeframe,
} from "../types.js";

export const MAX_COMBOS_PER_USER = 5;

export const DEFAULT_COMBO_NAME = "Oversold + Uptrend";
export const DEFAULT_COMBO_INDICATORS: IndicatorId[] = [
  "rsi_oversold",
  "above_ema_200",
  "above_sma_200",
];

export class ComboError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "COMBO_ERROR") {
    super(message);
    this.name = "ComboError";
    this.status = status;
    this.code = code;
  }
}

interface ComboRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ComboIndicatorRow {
  combo_id: string;
  indicator_id: string;
  timeframe: string;
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new ComboError("name is required");
  }
  const trimmed = raw.trim();
  if (!trimmed) throw new ComboError("name cannot be empty");
  if (trimmed.length > 80) throw new ComboError("name too long (max 80)");
  return trimmed;
}

export function sanitizeTimeframe(
  raw: unknown,
  indicatorId: IndicatorId,
): Timeframe {
  const value = raw == null ? "daily" : raw;
  if (typeof value !== "string" || !(TIMEFRAMES as string[]).includes(value)) {
    throw new ComboError(`invalid timeframe: ${String(raw)}`);
  }
  const tf = value as Timeframe;
  if (!supportedTimeframesForId(indicatorId).includes(tf)) {
    throw new ComboError(`${indicatorId} does not support ${tf} timeframe`);
  }
  return tf;
}

/**
 * Accepts either the v27 `{ indicatorId, timeframe }` objects or a legacy plain
 * id string (treated as daily). Dedupes on (indicator, timeframe) so the same
 * indicator can appear at two timeframes but not twice at one.
 */
function sanitizeIndicators(raw: unknown): ComboIndicatorRef[] {
  if (!Array.isArray(raw)) {
    throw new ComboError("indicators must be an array");
  }
  const out: ComboIndicatorRef[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    let indicatorId: unknown;
    let timeframeRaw: unknown;
    if (typeof v === "string") {
      indicatorId = v;
      timeframeRaw = "daily";
    } else if (v && typeof v === "object") {
      indicatorId = (v as { indicatorId?: unknown }).indicatorId;
      timeframeRaw = (v as { timeframe?: unknown }).timeframe;
    } else {
      throw new ComboError(`invalid indicator: ${String(v)}`);
    }
    if (typeof indicatorId !== "string" || !isIndicatorId(indicatorId)) {
      throw new ComboError(`unknown indicator id: ${String(indicatorId)}`);
    }
    const timeframe = sanitizeTimeframe(timeframeRaw, indicatorId);
    const key = `${indicatorId}:${timeframe}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ indicatorId, timeframe });
    }
  }
  return out;
}

export async function listCombos(userId: string): Promise<Combo[]> {
  const supabase = getSupabaseAdmin();
  const { data: comboRows, error: comboErr } = await supabase
    .from("combos")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (comboErr) {
    throw new ComboError(`failed to list combos: ${comboErr.message}`, 500);
  }
  const combos = (comboRows ?? []) as ComboRow[];
  if (combos.length === 0) return [];

  const ids = combos.map((c) => c.id);
  const { data: indRows, error: indErr } = await supabase
    .from("combo_indicators")
    .select("combo_id, indicator_id, timeframe")
    .in("combo_id", ids);
  if (indErr) {
    throw new ComboError(
      `failed to list combo indicators: ${indErr.message}`,
      500,
    );
  }
  const byCombo = new Map<string, ComboIndicatorRef[]>();
  for (const r of (indRows ?? []) as ComboIndicatorRow[]) {
    const list = byCombo.get(r.combo_id) ?? [];
    list.push({
      indicatorId: r.indicator_id,
      timeframe: (r.timeframe as Timeframe) ?? "daily",
    });
    byCombo.set(r.combo_id, list);
  }

  return combos.map((c) => ({
    id: c.id,
    name: c.name,
    indicators: (byCombo.get(c.id) ?? []).sort(
      (a, b) =>
        a.indicatorId.localeCompare(b.indicatorId) ||
        a.timeframe.localeCompare(b.timeframe),
    ),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

async function countCombos(userId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("combos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    throw new ComboError(`failed to count combos: ${error.message}`, 500);
  }
  return count ?? 0;
}

async function loadOwnedCombo(
  userId: string,
  comboId: string,
): Promise<ComboRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("combos")
    .select("id, user_id, name, created_at, updated_at")
    .eq("id", comboId)
    .maybeSingle();
  if (error) {
    throw new ComboError(`failed to load combo: ${error.message}`, 500);
  }
  if (!data) throw new ComboError("combo not found", 404, "COMBO_NOT_FOUND");
  if ((data as ComboRow).user_id !== userId) {
    throw new ComboError("combo not found", 404, "COMBO_NOT_FOUND");
  }
  return data as ComboRow;
}

export async function createCombo(
  userId: string,
  input: { name: unknown; indicators: unknown },
): Promise<Combo> {
  const name = sanitizeName(input.name);
  const indicators = sanitizeIndicators(input.indicators);
  if (indicators.length === 0) {
    throw new ComboError("a combo must have at least one indicator");
  }

  const existing = await countCombos(userId);
  if (existing >= MAX_COMBOS_PER_USER) {
    throw new ComboError(
      `Combo limit reached (${MAX_COMBOS_PER_USER}).`,
      403,
      "COMBO_LIMIT",
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: comboRow, error: insertErr } = await supabase
    .from("combos")
    .insert({ user_id: userId, name })
    .select("id, user_id, name, created_at, updated_at")
    .single();
  if (insertErr || !comboRow) {
    throw new ComboError(
      `failed to create combo: ${insertErr?.message ?? "unknown"}`,
      500,
    );
  }
  const created = comboRow as ComboRow;

  const { error: indErr } = await supabase
    .from("combo_indicators")
    .insert(
      indicators.map((ref) => ({
        combo_id: created.id,
        indicator_id: ref.indicatorId,
        timeframe: ref.timeframe,
      })),
    );
  if (indErr) {
    await supabase.from("combos").delete().eq("id", created.id);
    throw new ComboError(
      `failed to populate combo indicators: ${indErr.message}`,
      500,
    );
  }

  return {
    id: created.id,
    name: created.name,
    indicators: [...indicators].sort(
      (a, b) =>
        a.indicatorId.localeCompare(b.indicatorId) ||
        a.timeframe.localeCompare(b.timeframe),
    ),
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  };
}

export async function updateCombo(
  userId: string,
  comboId: string,
  input: { name?: unknown; indicators?: unknown },
): Promise<Combo> {
  await loadOwnedCombo(userId, comboId);
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (input.name !== undefined) {
    const name = sanitizeName(input.name);
    const { error } = await supabase
      .from("combos")
      .update({ name, updated_at: now })
      .eq("id", comboId);
    if (error) {
      throw new ComboError(`failed to rename combo: ${error.message}`, 500);
    }
  }

  if (input.indicators !== undefined) {
    const refs = sanitizeIndicators(input.indicators);
    if (refs.length === 0) {
      throw new ComboError("a combo must have at least one indicator");
    }
    const { error: delErr } = await supabase
      .from("combo_indicators")
      .delete()
      .eq("combo_id", comboId);
    if (delErr) {
      throw new ComboError(
        `failed to update combo indicators: ${delErr.message}`,
        500,
      );
    }
    const { error: insErr } = await supabase.from("combo_indicators").insert(
      refs.map((ref) => ({
        combo_id: comboId,
        indicator_id: ref.indicatorId,
        timeframe: ref.timeframe,
      })),
    );
    if (insErr) {
      throw new ComboError(
        `failed to update combo indicators: ${insErr.message}`,
        500,
      );
    }
    await supabase
      .from("combos")
      .update({ updated_at: now })
      .eq("id", comboId);
  }

  const combos = await listCombos(userId);
  const result = combos.find((c) => c.id === comboId);
  if (!result) throw new ComboError("combo not found", 404, "COMBO_NOT_FOUND");
  return result;
}

export async function deleteCombo(
  userId: string,
  comboId: string,
): Promise<void> {
  await loadOwnedCombo(userId, comboId);
  const { error } = await getSupabaseAdmin()
    .from("combos")
    .delete()
    .eq("id", comboId);
  if (error) {
    throw new ComboError(`failed to delete combo: ${error.message}`, 500);
  }
}

export async function addIndicatorToCombo(
  userId: string,
  comboId: string,
  indicatorId: unknown,
  timeframe: unknown,
): Promise<Combo> {
  await loadOwnedCombo(userId, comboId);
  if (typeof indicatorId !== "string" || !isIndicatorId(indicatorId)) {
    throw new ComboError(`unknown indicator id: ${String(indicatorId)}`);
  }
  const tf = sanitizeTimeframe(timeframe, indicatorId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("combo_indicators")
    .upsert(
      { combo_id: comboId, indicator_id: indicatorId, timeframe: tf },
      { onConflict: "combo_id,indicator_id,timeframe", ignoreDuplicates: true },
    );
  if (error) {
    throw new ComboError(
      `failed to add indicator to combo: ${error.message}`,
      500,
    );
  }
  await supabase
    .from("combos")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", comboId);

  const combos = await listCombos(userId);
  const result = combos.find((c) => c.id === comboId);
  if (!result) throw new ComboError("combo not found", 404, "COMBO_NOT_FOUND");
  return result;
}

export async function removeIndicatorFromCombo(
  userId: string,
  comboId: string,
  indicatorId: string,
  timeframe?: string,
): Promise<Combo> {
  await loadOwnedCombo(userId, comboId);
  const supabase = getSupabaseAdmin();

  const { count, error: countErr } = await supabase
    .from("combo_indicators")
    .select("*", { count: "exact", head: true })
    .eq("combo_id", comboId);
  if (countErr) {
    throw new ComboError(
      `failed to inspect combo: ${countErr.message}`,
      500,
    );
  }
  if ((count ?? 0) <= 1) {
    throw new ComboError("a combo must have at least one indicator");
  }

  let del = supabase
    .from("combo_indicators")
    .delete()
    .eq("combo_id", comboId)
    .eq("indicator_id", indicatorId);
  // A specific timeframe targets one instance; omitting it removes every
  // timeframe variant of the indicator.
  if (timeframe != null) del = del.eq("timeframe", timeframe);
  const { error } = await del;
  if (error) {
    throw new ComboError(
      `failed to remove indicator: ${error.message}`,
      500,
    );
  }
  await supabase
    .from("combos")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", comboId);

  const combos = await listCombos(userId);
  const result = combos.find((c) => c.id === comboId);
  if (!result) throw new ComboError("combo not found", 404, "COMBO_NOT_FOUND");
  return result;
}

export async function ensureUserHasCombo(userId: string): Promise<void> {
  const existing = await countCombos(userId);
  if (existing > 0) return;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("combos")
    .insert({ user_id: userId, name: DEFAULT_COMBO_NAME })
    .select("id")
    .single();
  if (error || !data) {
    console.warn(
      `[combos] failed to seed default combo for ${userId}: ${error?.message ?? "unknown"}`,
    );
    return;
  }
  const { error: insErr } = await supabase
    .from("combo_indicators")
    .insert(
      DEFAULT_COMBO_INDICATORS.map((indicator_id) => ({
        combo_id: data.id,
        indicator_id,
        timeframe: "daily",
      })),
    );
  if (insErr) {
    console.warn(
      `[combos] failed to seed default combo indicators for ${userId}: ${insErr.message}`,
    );
  }
}

/**
 * Evaluate every combo against per-timeframe EvalContexts. Each combo indicator
 * is resolved against the context for its chosen timeframe; a combo is green iff
 * every indicator triggers. If a timeframe has no data (e.g. weekly backfill
 * failed or is still in flight), that indicator reports "Data unavailable" and
 * cannot trigger, so the combo can't be green.
 *
 * Market-wide indicators read today's `market_data` (fetched once, then cached
 * for the rest of the day) and are daily-only by registry constraint.
 */
export async function evaluateCombos(
  combos: Combo[],
  ctxByTimeframe: Record<Timeframe, EvalContext | null>,
): Promise<ComboStatus[]> {
  const marketData = await getTodayMarketData();
  return combos.map((combo) => {
    const indicators = combo.indicators.map((ref) => {
      const def = INDICATOR_REGISTRY[ref.indicatorId];
      if (!def) {
        return {
          indicatorId: ref.indicatorId,
          label: ref.indicatorId,
          abbreviation: "",
          timeframe: ref.timeframe,
          triggered: false,
          displayValue: "unknown",
        };
      }
      const ctx = ctxByTimeframe[ref.timeframe];
      if (!ctx) {
        return {
          indicatorId: ref.indicatorId,
          label: def.label,
          abbreviation: def.abbreviation,
          timeframe: ref.timeframe,
          triggered: false,
          displayValue: "Data unavailable",
        };
      }
      const { triggered, displayValue } = def.evaluate(ctx, marketData);
      return {
        indicatorId: ref.indicatorId,
        label: def.label,
        abbreviation: def.abbreviation,
        timeframe: ref.timeframe,
        triggered,
        displayValue,
      };
    });
    return {
      comboId: combo.id,
      name: combo.name,
      green: indicators.length > 0 && indicators.every((i) => i.triggered),
      indicators,
    };
  });
}
