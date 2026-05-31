import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatPrice, marketBadge } from "../lib/symbol";
import type { WatchlistItem as Item } from "../types";

interface Props {
  item: Item;
  active: boolean;
  onRemove: (symbol: string) => void;
  removing: boolean;
}

export function WatchlistItem({ item, active, onRemove, removing }: Props) {
  const { t } = useTranslation();
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
      onMouseLeave={() => setConfirming(false)}
      className={`wl-item${active ? " active" : ""}`}
      data-testid="watchlist-item"
      data-ticker={item.ticker}
      data-active={active ? "true" : "false"}
      data-any-green={anyGreen ? "true" : "false"}
    >
      {confirming ? (
        <div className="wl-confirm">
          <span className="q">{t("watchlist.removeConfirm", { ticker: item.ticker })}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              disabled={removing}
              onClick={(e) => {
                e.preventDefault();
                onRemove(item.symbol);
              }}
              data-testid="watchlist-confirm-yes"
            >
              {t("common.yes")}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setConfirming(false);
              }}
              data-testid="watchlist-confirm-no"
            >
              {t("common.no")}
            </button>
          </div>
        </div>
      ) : (
        <Link
          to={`/dashboard/${item.symbol}`}
          style={{ display: "block" }}
          data-testid="watchlist-item-link"
        >
          <div className="wl-row">
            <div style={{ minWidth: 0 }}>
              <div className="wl-tk">
                {item.ticker}
                <span
                  className={`mkt-badge mkt-${marketBadge(item.exchange).toLowerCase()}`}
                >
                  {marketBadge(item.exchange)}
                </span>
              </div>
              <div className="wl-name">{item.name}</div>
            </div>
            {/* Visible-on-hover for mouse, always-visible on touch (see CSS). */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirming(true);
              }}
              aria-label={t("watchlist.removeTicker", { ticker: item.ticker })}
              className="wl-remove"
              data-testid="watchlist-remove"
            >
              ✕
            </button>
          </div>

          {item.dataReady ? (
            <div className="wl-price-row">
              <span className="wl-price">
                {item.currentPrice != null
                  ? formatPrice(item.currentPrice, item.currency)
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
            <div className="wl-loading">{t("watchlist.itemLoading")}</div>
          )}

          {item.dataReady && (
            <div
              className={`wl-status${anyGreen ? " green" : ""}`}
              data-testid="watchlist-combo-status"
            >
              <span className="dot" aria-hidden />
              <span>
                {totalCombos === 0
                  ? t("watchlist.noCombos")
                  : anyGreen
                    ? t("watchlist.combosTriggered", { count: greenCount })
                    : t("watchlist.noCombosTriggered")}
              </span>
            </div>
          )}
        </Link>
      )}
    </div>
  );
}
