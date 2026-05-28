import type { EvalContext } from "../eval-context.js";
import { INDICATOR_REGISTRY, isIndicatorId } from "../indicator-registry.js";
import { getSupabaseAdmin } from "../supabase.js";
import { getTodayMarketData } from "./market-data.js";
import type { Combo, ComboStatus, IndicatorId } from "../types.js";

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

function sanitizeIndicatorIds(raw: unknown): IndicatorId[] {
  if (!Array.isArray(raw)) {
    throw new ComboError("indicatorIds must be an array");
  }
  const out: IndicatorId[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== "string") {
      throw new ComboError(`invalid indicator id: ${String(v)}`);
    }
    if (!isIndicatorId(v)) {
      throw new ComboError(`unknown indicator id: ${v}`);
    }
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
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
    .select("combo_id, indicator_id")
    .in("combo_id", ids);
  if (indErr) {
    throw new ComboError(
      `failed to list combo indicators: ${indErr.message}`,
      500,
    );
  }
  const byCombo = new Map<string, IndicatorId[]>();
  for (const r of (indRows ?? []) as ComboIndicatorRow[]) {
    const list = byCombo.get(r.combo_id) ?? [];
    list.push(r.indicator_id);
    byCombo.set(r.combo_id, list);
  }

  return combos.map((c) => ({
    id: c.id,
    name: c.name,
    indicatorIds: (byCombo.get(c.id) ?? []).sort((a, b) => a.localeCompare(b)),
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
  input: { name: unknown; indicatorIds: unknown },
): Promise<Combo> {
  const name = sanitizeName(input.name);
  const indicatorIds = sanitizeIndicatorIds(input.indicatorIds);
  if (indicatorIds.length === 0) {
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
      indicatorIds.map((indicator_id) => ({
        combo_id: created.id,
        indicator_id,
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
    indicatorIds: [...indicatorIds].sort((a, b) => a.localeCompare(b)),
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  };
}

export async function updateCombo(
  userId: string,
  comboId: string,
  input: { name?: unknown; indicatorIds?: unknown },
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

  if (input.indicatorIds !== undefined) {
    const ids = sanitizeIndicatorIds(input.indicatorIds);
    if (ids.length === 0) {
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
    const { error: insErr } = await supabase
      .from("combo_indicators")
      .insert(ids.map((indicator_id) => ({ combo_id: comboId, indicator_id })));
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
): Promise<Combo> {
  await loadOwnedCombo(userId, comboId);
  if (typeof indicatorId !== "string" || !isIndicatorId(indicatorId)) {
    throw new ComboError(`unknown indicator id: ${String(indicatorId)}`);
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("combo_indicators")
    .upsert(
      { combo_id: comboId, indicator_id: indicatorId },
      { onConflict: "combo_id,indicator_id", ignoreDuplicates: true },
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

  const { error } = await supabase
    .from("combo_indicators")
    .delete()
    .eq("combo_id", comboId)
    .eq("indicator_id", indicatorId);
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
      })),
    );
  if (insErr) {
    console.warn(
      `[combos] failed to seed default combo indicators for ${userId}: ${insErr.message}`,
    );
  }
}

/**
 * Evaluate every combo for the given EvalContext. A combo is green iff every
 * indicator inside it triggers. Empty combos are treated as not-green.
 *
 * Market-wide indicators read today's `market_data` (fetched once, then cached
 * for the rest of the day); per-stock indicators ignore it.
 */
export async function evaluateCombos(
  combos: Combo[],
  ctx: EvalContext,
): Promise<ComboStatus[]> {
  const marketData = await getTodayMarketData();
  return combos.map((combo) => {
    const indicators = combo.indicatorIds.map((id) => {
      const def = INDICATOR_REGISTRY[id];
      if (!def) {
        return {
          indicatorId: id,
          label: id,
          abbreviation: "",
          triggered: false,
          displayValue: "unknown",
        };
      }
      const { triggered, displayValue } = def.evaluate(ctx, marketData);
      return {
        indicatorId: id,
        label: def.label,
        abbreviation: def.abbreviation,
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
