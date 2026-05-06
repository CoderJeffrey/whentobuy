import { INDICATOR_REGISTRY } from "./indicator-registry.js";
import type {
  IndicatorId,
  IndicatorRow,
  PriceRow,
  Rating,
  Score,
  ScoreBreakdownItem,
  Tier,
  UserWeights,
} from "./types.js";

const TIER_POINTS: Record<Tier, number> = { high: 10, medium: 5, low: 2 };

const TIER_ORDER: Tier[] = ["high", "medium", "low"];

function ratingForPct(pct: number): Rating {
  if (pct >= 80) return "strong_buy";
  if (pct >= 60) return "weak_buy";
  if (pct >= 40) return "hold";
  if (pct >= 20) return "weak_sell";
  return "immediate_sell";
}

export function scoreDashboard(
  latestPrice: PriceRow,
  latestIndicators: IndicatorRow,
  recentIndicators: IndicatorRow[],
  weights: UserWeights,
): Score {
  const entries = (Object.entries(weights) as [IndicatorId, Tier][])
    .filter(([id]) => INDICATOR_REGISTRY[id] !== undefined)
    .sort((a, b) => TIER_ORDER.indexOf(a[1]) - TIER_ORDER.indexOf(b[1]));

  const breakdown: ScoreBreakdownItem[] = entries.flatMap(([id, tier]) => {
    const def = INDICATOR_REGISTRY[id];
    if (!def) return [];
    const result = def.evaluate(latestPrice, latestIndicators, recentIndicators);
    const pointsMax = TIER_POINTS[tier];
    return [
      {
        id,
        label: def.label,
        abbreviation: def.abbreviation,
        tier,
        points: result.triggered ? pointsMax : 0,
        triggered: result.triggered,
        displayValue: result.displayValue,
      },
    ];
  });

  const total = breakdown.reduce((s, x) => s + x.points, 0);
  const max = entries.reduce((s, [, tier]) => s + TIER_POINTS[tier], 0);
  const percentage = max === 0 ? 50 : Math.round((total / max) * 100);
  const triggeredCount = breakdown.filter((b) => b.triggered).length;

  return {
    total,
    max,
    percentage,
    rating: ratingForPct(percentage),
    triggeredCount,
    totalCount: breakdown.length,
    breakdown,
  };
}
