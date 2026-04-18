import type { DashboardResponse } from "../types";
import { RatingBadge } from "./RatingBadge";

export function ScoreCard({ data }: { data: DashboardResponse }) {
  const { ticker, currentPrice, priceChange, priceChangePct, score } = data;
  const changePositive = priceChange >= 0;
  const changeColor = changePositive
    ? "var(--rating-strong_buy)"
    : "var(--rating-immediate_sell)";
  const ratingColor = `var(--rating-${score.rating})`;

  return (
    <section
      className="rounded-2xl p-10 flex flex-col items-center gap-6"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <h2
          className="text-5xl font-bold tracking-tight"
          style={{ color: "var(--gold)" }}
          data-testid="ticker"
        >
          {ticker}
        </h2>
        <div
          className="text-sm uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Apple Inc.
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span
            className="font-mono text-4xl font-medium"
            data-testid="current-price"
          >
            ${currentPrice.toFixed(2)}
          </span>
          <span
            className="font-mono text-lg"
            style={{ color: changeColor }}
            data-testid="price-change"
          >
            {changePositive ? "▲" : "▼"} {changePositive ? "+" : ""}
            {priceChange.toFixed(2)} ({changePositive ? "+" : ""}
            {priceChangePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <RatingBadge rating={score.rating} />

      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <div className="flex items-baseline gap-2">
          <span
            className="font-mono text-2xl font-medium"
            data-testid="score-total"
          >
            {score.total}
          </span>
          <span
            className="font-mono text-xl"
            style={{ color: "var(--text-muted)" }}
          >
            / {score.max}
          </span>
          <span
            className="font-mono text-lg ml-2"
            style={{ color: "var(--text-muted)" }}
            data-testid="score-percentage"
          >
            ({score.percentage}%)
          </span>
        </div>
        <div
          className="w-full h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-card-hover)" }}
        >
          <div
            data-testid="score-bar"
            className="h-full rounded-full transition-all"
            style={{
              width: `${score.percentage}%`,
              backgroundColor: ratingColor,
            }}
          />
        </div>
      </div>
    </section>
  );
}
