import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { INDICATOR_REGISTRY } from "./indicator-registry.js";
import type { IndicatorId, Tier, UserConfig, UserWeights } from "./types.js";

const CONFIG_PATH = resolve(
  process.env.CONFIG_PATH ?? "./data/user-config.json",
);

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

function ensureDir(): void {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadConfig(): UserConfig {
  ensureDir();
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return validateConfig(parsed);
  } catch (err) {
    console.warn(
      `[config] failed to load user config (${String(err)}); falling back to defaults`,
    );
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: UserConfig): UserConfig {
  ensureDir();
  const validated = validateConfig(config);
  writeFileSync(CONFIG_PATH, JSON.stringify(validated, null, 2));
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
