import { RATING_LABELS } from "../lib/ratings";
import type { Rating } from "../types";

export function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <div
      data-testid="rating-badge"
      data-rating={rating}
      className="inline-flex items-center justify-center px-10 py-4 rounded-2xl text-2xl tracking-tight"
      style={{
        backgroundColor: "var(--bg-card-raised)",
        color: `var(--rating-${rating})`,
        border: `1px solid color-mix(in srgb, var(--rating-${rating}) 40%, transparent)`,
        fontWeight: 500,
      }}
    >
      {RATING_LABELS[rating]}
    </div>
  );
}
