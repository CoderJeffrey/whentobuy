import type { DashboardResponse } from "../types";
import { Gauge } from "./Gauge";

export function ScoreCard({ data }: { data: DashboardResponse }) {
  const { ticker, currentPrice, priceChange, priceChangePct, score } = data;
  const changePositive = priceChange >= 0;
  const changeColor = changePositive
    ? "var(--rating-strong_buy)"
    : "var(--rating-immediate_sell)";

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

      <Gauge
        percentage={score.percentage}
        rating={score.rating}
        total={score.total}
        max={score.max}
      />
    </section>
  );
}
