import { INDICATOR_REGISTRY } from "./indicator-registry.js";
import { getSupabaseAdmin } from "./supabase.js";
import type { IndicatorId, Tier, UserConfig, UserWeights } from "./types.js";

const VALID_TIERS: Tier[] = ["high", "medium", "low"];
const VALID_IDS = new Set<IndicatorId>(
  Object.keys(INDICATOR_REGISTRY) as IndicatorId[],
);

export const DEFAULT_CONFIG: UserConfig = {
  weights: {
    rsi_oversold: "high",
    bb_lower_touch: "medium",
    macd_bullish_cross: "medium",
    volume_spike: "medium",
    near_52w_low: "low",
  },
};

export async function loadConfig(userId: string): Promise<UserConfig> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_configs")
    .select("weights")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn(
      `[config] failed to load config for ${userId}: ${error.message}; falling back to defaults`,
    );
    return DEFAULT_CONFIG;
  }
  if (!data) return DEFAULT_CONFIG;
  try {
    return validateConfig({ weights: data.weights });
  } catch (err) {
    console.warn(
      `[config] stored config for ${userId} invalid (${String(err)}); falling back to defaults`,
    );
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(
  userId: string,
  config: UserConfig,
): Promise<UserConfig> {
  const validated = validateConfig(config);
  const { error } = await getSupabaseAdmin()
    .from("user_configs")
    .upsert(
      {
        user_id: userId,
        weights: validated.weights,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    throw new ConfigError(`failed to save config: ${error.message}`);
  }
  return validated;
}

export function validateConfig(input: unknown): UserConfig {
  if (!input || typeof input !== "object") {
    throw new ConfigError("config must be an object");
  }
  const weights = (input as { weights?: unknown }).weights;
  if (!weights || typeof weights !== "object") {
    throw new ConfigError("config.weights must be an object");
  }
  const out: UserWeights = {};
  for (const [id, tier] of Object.entries(weights)) {
    if (!VALID_IDS.has(id as IndicatorId)) {
      throw new ConfigError(`unknown indicator id: ${id}`);
    }
    if (typeof tier !== "string" || !VALID_TIERS.includes(tier as Tier)) {
      throw new ConfigError(
        `indicator ${id} has invalid tier ${String(tier)} (expected high|medium|low)`,
      );
    }
    out[id as IndicatorId] = tier as Tier;
  }
  return { weights: out };
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
