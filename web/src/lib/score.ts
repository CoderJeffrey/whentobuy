import type {
  Rating,
  Score,
  ScoreBreakdownItem,
  Tier,
  UserWeights,
} from "../types";

const TIER_POINTS: Record<Tier, number> = { high: 10, medium: 5, low: 2 };

const TIER_ORDER: Tier[] = ["high", "medium", "low"];

function ratingForPct(pct: number): Rating {
  if (pct >= 80) return "strong_buy";
  if (pct >= 60) return "weak_buy";
  if (pct >= 40) return "hold";
  if (pct >= 20) return "weak_sell";
  return "immediate_sell";
}

/**
 * Recompute the score client-side from optimistic weights and the most
 * recent server breakdown. Mirrors `scoreDashboard` in server/src/scoring.ts.
 *
 * `triggered` / `displayValue` for an id are taken from `serverBreakdown` if
 * present (carried over from the last server response). Indicators newly
 * added to the weights map will show as not-yet-triggered until the next
 * dashboard refetch — but tier moves and removals reflect immediately.
 */
export function deriveLiveScore(
  weights: UserWeights,
  serverBreakdown: ScoreBreakdownItem[],
): Score {
  const lookup = new Map<string, ScoreBreakdownItem>();
  for (const b of serverBreakdown) lookup.set(b.id, b);

  const entries = (Object.entries(weights) as [string, Tier][])
    .filter(([, tier]) => tier === "high" || tier === "medium" || tier === "low")
    .sort(
      (a, b) => TIER_ORDER.indexOf(a[1]) - TIER_ORDER.indexOf(b[1]),
    );

  const breakdown: ScoreBreakdownItem[] = entries.map(([id, tier]) => {
    const prior = lookup.get(id);
    const triggered = prior?.triggered ?? false;
    const pointsMax = TIER_POINTS[tier];
    return {
      id,
      label: prior?.label ?? id,
      abbreviation: prior?.abbreviation ?? "",
      tier,
      points: triggered ? pointsMax : 0,
      triggered,
      displayValue: prior?.displayValue ?? "",
    };
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
