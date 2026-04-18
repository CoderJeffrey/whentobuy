import type { Score } from "../types";
import { IndicatorRow } from "./IndicatorRow";

export function BreakdownCard({ score }: { score: Score }) {
  return (
    <section
      className="rounded-2xl p-8"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <h3 className="text-xl font-semibold mb-2">Why this rating?</h3>
      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Three indicators, weighted by importance. Total score determines the
        rating.
      </p>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {score.breakdown.map((item) => (
          <div
            key={item.id}
            style={{ borderTop: "1px solid var(--border)" }}
            className="first:border-t-0"
          >
            <IndicatorRow item={item} />
          </div>
        ))}
      </div>

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
