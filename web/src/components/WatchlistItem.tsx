import { useState } from "react";
import { Link } from "react-router-dom";
import { RATING_LABELS } from "../lib/ratings";
import type { WatchlistItem as Item } from "../types";

function formatChange(pct: number | undefined): {
  text: string;
  color: string;
  arrow: string;
} {
  if (pct == null) return { text: "", color: "var(--text-tertiary)", arrow: "" };
  const up = pct >= 0;
  return {
    text: `${up ? "+" : ""}${pct.toFixed(2)}%`,
    color: up ? "var(--positive)" : "var(--negative)",
    arrow: up ? "▲" : "▼",
  };
}

interface Props {
  item: Item;
  active: boolean;
  onRemove: (ticker: string) => void;
  removing: boolean;
}

export function WatchlistItem({ item, active, onRemove, removing }: Props) {
  const [hovered, setHovered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const change = formatChange(item.priceChangePct);

  const borderColor = active
    ? "var(--accent)"
    : hovered
      ? "var(--border-strong)"
      : "var(--border)";
  const bg = active
    ? "color-mix(in srgb, var(--accent) 10%, var(--bg-card))"
    : hovered
      ? "var(--bg-card-raised)"
      : "var(--bg-card)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setConfirming(false);
      }}
      className="relative rounded-md transition-colors"
      style={{
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        borderLeftWidth: active ? "3px" : "1px",
      }}
      data-testid="watchlist-item"
      data-ticker={item.ticker}
      data-active={active ? "true" : "false"}
    >
      {confirming ? (
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          <span
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Remove {item.ticker}?
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={removing}
              onClick={(e) => {
                e.preventDefault();
                onRemove(item.ticker);
              }}
              className="px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: "var(--bg-subtle)",
                color: "var(--negative)",
                border: "1px solid var(--border-strong)",
              }}
              data-testid="watchlist-confirm-yes"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setConfirming(false);
              }}
              className="px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-strong)",
              }}
              data-testid="watchlist-confirm-no"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <Link
          to={`/dashboard/${item.ticker}`}
          className="block px-3 py-2.5"
          data-testid="watchlist-item-link"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className="font-mono text-sm"
                style={{ color: "var(--accent)", fontWeight: 500 }}
              >
                {item.ticker}
              </div>
              <div
                className="text-[11px] truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {item.name}
              </div>
            </div>
            {hovered && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(true);
                }}
                aria-label={`Remove ${item.ticker}`}
                className="text-sm leading-none shrink-0 mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
                data-testid="watchlist-remove"
              >
                ✕
              </button>
            )}
          </div>

          {item.dataReady ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div
                className="font-mono text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {item.currentPrice != null
                  ? `$${item.currentPrice.toFixed(2)}`
                  : "—"}
              </div>
              {item.priceChangePct != null && (
                <div
                  className="font-mono text-[11px]"
                  style={{ color: change.color }}
                >
                  {change.arrow} {change.text}
                </div>
              )}
            </div>
          ) : (
            <div
              className="mt-1.5 text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Loading…
            </div>
          )}

          {item.dataReady && item.rating && (
            <div
              className="mt-1 flex items-center gap-1.5 text-[11px]"
              style={{ color: `var(--rating-${item.rating})` }}
            >
              <span style={{ fontWeight: 500 }}>
                {RATING_LABELS[item.rating]}
              </span>
              {item.percentage != null && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  · {item.percentage}%
                </span>
              )}
            </div>
          )}
        </Link>
      )}
    </div>
  );
}
