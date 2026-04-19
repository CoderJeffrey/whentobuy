import type { Rating } from "../types";

const LABELS: Record<Rating, string> = {
  strong_buy: "STRONG BUY",
  weak_buy: "WEAK BUY",
  hold: "HOLD",
  weak_sell: "WEAK SELL",
  immediate_sell: "IMMEDIATE SELL",
};

export function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <div
      data-testid="rating-badge"
      data-rating={rating}
      className="inline-flex items-center justify-center px-10 py-4 rounded-2xl text-2xl tracking-label uppercase"
      style={{
        backgroundColor: "var(--bg-card-raised)",
        color: `var(--rating-${rating})`,
        border: `1px solid color-mix(in srgb, var(--rating-${rating}) 40%, transparent)`,
        fontWeight: 500,
      }}
    >
      {LABELS[rating]}
    </div>
  );
}
