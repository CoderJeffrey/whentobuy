import type { Score, Tier } from "../types";
import { IndicatorRow } from "./IndicatorRow";

const TIER_ORDER: Tier[] = ["high", "medium", "low"];

export function BreakdownCard({ score }: { score: Score }) {
  const byTier: Record<Tier, typeof score.breakdown> = {
    high: [],
    medium: [],
    low: [],
  };
  for (const item of score.breakdown) byTier[item.tier].push(item);

  const hasItems = score.breakdown.length > 0;

  return (
    <section
      className="rounded-2xl p-8"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xl font-semibold">Why this rating?</h3>
        <span
          className="font-mono text-sm"
          style={{ color: "var(--text-muted)" }}
          data-testid="breakdown-counts"
        >
          {score.triggeredCount} / {score.totalCount} triggered
        </span>
      </div>
      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Indicators grouped by your tier weights. Adjust them on the{" "}
        <a
          href="/weights"
          className="underline"
          style={{ color: "var(--gold)" }}
        >
          Weights
        </a>{" "}
        page.
      </p>

      {!hasItems && (
        <div
          className="py-8 text-center text-sm"
          style={{ color: "var(--text-muted)" }}
          data-testid="breakdown-empty"
        >
          No indicators configured. Add some on the Weights page.
        </div>
      )}

      {hasItems &&
        TIER_ORDER.filter((t) => byTier[t].length > 0).map((tier) => (
          <div key={tier}>
            {byTier[tier].map((item) => (
              <div
                key={item.id}
                style={{ borderTop: "1px solid var(--border)" }}
                className="first:border-t-0"
              >
                <IndicatorRow item={item} />
              </div>
            ))}
          </div>
        ))}

      <div
        className="flex items-center justify-between pt-5 mt-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span
          className="text-sm font-semibold tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          TOTAL
        </span>
        <span className="font-mono text-xl font-semibold">
          {score.total} / {score.max}
        </span>
      </div>
    </section>
  );
}
