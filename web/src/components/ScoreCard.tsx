import type { DashboardResponse } from "../types";
import { Gauge } from "./Gauge";

export function ScoreCard({ data }: { data: DashboardResponse }) {
  const { ticker, name, currentPrice, priceChange, priceChangePct, score } =
    data;
  const changePositive = priceChange >= 0;
  const changeColor = changePositive
    ? "var(--positive)"
    : "var(--negative)";

  return (
    <section
      className="rounded-2xl p-10 flex flex-col items-center gap-8"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow:
          "0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <h2
          className="text-5xl tracking-tight"
          style={{ color: "var(--accent)", fontWeight: 500 }}
          data-testid="ticker"
        >
          {ticker}
        </h2>
        <div
          className="text-xs uppercase tracking-label"
          style={{ color: "var(--text-secondary)" }}
        >
          {name}
        </div>
        <div className="flex items-baseline gap-3 mt-2">
          <span
            className="font-mono text-4xl"
            style={{ fontWeight: 500, color: "var(--text-primary)" }}
            data-testid="current-price"
          >
            ${currentPrice.toFixed(2)}
          </span>
          <span
            className="font-mono text-base"
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
