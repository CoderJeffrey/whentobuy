import type { ScoreBreakdownItem, Tier } from "../types";

const TIER_META: Record<
  Tier,
  { label: string; swatch: string; maxPoints: number }
> = {
  high: { label: "HIGH IMPORTANCE", swatch: "🔴", maxPoints: 10 },
  medium: { label: "MEDIUM IMPORTANCE", swatch: "🟡", maxPoints: 5 },
  low: { label: "LOW IMPORTANCE", swatch: "⚪", maxPoints: 2 },
};

export function IndicatorRow({ item }: { item: ScoreBreakdownItem }) {
  const tier = TIER_META[item.tier];
  const tierColor = `var(--tier-${item.tier})`;

  return (
    <div
      data-testid="indicator-row"
      data-indicator-id={item.id}
      className="flex flex-col gap-3 py-5"
    >
      <div
        className="flex items-center gap-2 text-xs font-semibold tracking-wider"
        style={{ color: tierColor }}
      >
        <span>{tier.swatch}</span>
        <span>{tier.label}</span>
        <span style={{ color: "var(--text-muted)" }}>
          · {tier.maxPoints} points
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 pl-6">
        <div className="flex items-start gap-3">
          <span
            className="text-xl mt-0.5"
            aria-hidden
            style={{
              color: item.triggered
                ? "var(--rating-strong_buy)"
                : "var(--text-muted)",
            }}
          >
            {item.triggered ? "✅" : "❌"}
          </span>
          <div className="flex flex-col">
            <span
              className={`text-lg font-medium ${item.triggered ? "" : "opacity-60"}`}
            >
              {item.label}
            </span>
            <span
              className="text-sm font-mono mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {item.displayValue}
            </span>
          </div>
        </div>
        <div
          data-testid="indicator-points"
          className="font-mono text-lg font-semibold whitespace-nowrap"
          style={{
            color: item.triggered
              ? "var(--rating-strong_buy)"
              : "var(--text-muted)",
            opacity: item.triggered ? 1 : 0.6,
          }}
        >
          {item.triggered ? `+${item.points}` : "0"} pts
        </div>
      </div>
    </div>
  );
}
