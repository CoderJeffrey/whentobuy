import { useState } from "react";
import { Link } from "react-router-dom";
import type { WatchlistItem as Item } from "../types";

interface Props {
  item: Item;
  active: boolean;
  onRemove: (ticker: string) => void;
  removing: boolean;
}

export function WatchlistItem({ item, active, onRemove, removing }: Props) {
  const [hovered, setHovered] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const greenCount = item.greenComboCount ?? 0;
  const totalCombos = item.totalCombos ?? 0;
  const anyGreen = greenCount > 0;

  const up = (item.priceChangePct ?? 0) >= 0;
  const chgText =
    item.priceChangePct != null
      ? `${up ? "+" : ""}${item.priceChangePct.toFixed(2)}%`
      : "";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setConfirming(false);
      }}
      className={`wl-item${active ? " active" : ""}`}
      data-testid="watchlist-item"
      data-ticker={item.ticker}
      data-active={active ? "true" : "false"}
      data-any-green={anyGreen ? "true" : "false"}
    >
      {confirming ? (
        <div className="wl-confirm">
          <span className="q">Remove {item.ticker}?</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              disabled={removing}
              onClick={(e) => {
                e.preventDefault();
                onRemove(item.ticker);
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
              data-testid="watchlist-confirm-no"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <Link
          to={`/dashboard/${item.ticker}`}
          style={{ display: "block" }}
          data-testid="watchlist-item-link"
        >
          <div className="wl-row">
            <div style={{ minWidth: 0 }}>
              <div className="wl-tk">{item.ticker}</div>
              <div className="wl-name">{item.name}</div>
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
                className="wl-remove"
                data-testid="watchlist-remove"
              >
                ✕
              </button>
            )}
          </div>

          {item.dataReady ? (
            <div className="wl-price-row">
              <span className="wl-price">
                {item.currentPrice != null
                  ? `$${item.currentPrice.toFixed(2)}`
                  : "—"}
              </span>
              {item.priceChangePct != null && (
                <span className={`wl-chg${up ? "" : " down"}`}>
                  <span className="arrow" />
                  {chgText}
                </span>
              )}
            </div>
          ) : (
            <div className="wl-loading">Loading…</div>
          )}

          {item.dataReady && (
            <div
              className={`wl-status${anyGreen ? " green" : ""}`}
              data-testid="watchlist-combo-status"
            >
              <span className="dot" aria-hidden />
              <span>
                {totalCombos === 0
                  ? "No combos"
                  : anyGreen
                    ? `${greenCount} ${greenCount === 1 ? "combo" : "combos"} triggered`
                    : "No combos triggered"}
              </span>
            </div>
          )}
        </Link>
      )}
    </div>
  );
}
