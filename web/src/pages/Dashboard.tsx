import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchDashboard } from "../lib/api";
import { PriceChart } from "../components/PriceChart";
import { SearchBar } from "../components/SearchBar";
import { Watchlist } from "../components/Watchlist";
import { useWatchlist } from "../hooks/useWatchlist";
import { useIsMobile } from "../hooks/useMediaQuery";
import { formatPrice, formatSymbol, marketBadge, parseSymbol } from "../lib/symbol";
import { TIMEFRAME_LABELS, type ComboStatus, type DashboardResponse } from "../types";
import "./Dashboard.css";

function formatLastUpdated(asOf: string | undefined): string {
  if (!asOf) return "—";
  const d = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return asOf;
  // `asOf` is a calendar trading date (YYYY-MM-DD), not an instant. Format it
  // in UTC — the same zone it was parsed in — so it isn't shifted a day back
  // for viewers west of UTC (e.g. ET would otherwise render May 22 as May 21).
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatVolume(v: number | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

export default function Dashboard() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { symbol: symbolParam } = useParams<{ symbol: string }>();
  const raw = symbolParam ?? "AAPL.US";
  const parsed = parseSymbol(raw);
  const symbol = formatSymbol(parsed.ticker, parsed.exchange);
  const ticker = parsed.ticker;
  const needsRedirect = raw.toUpperCase() !== symbol;

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", symbol],
    queryFn: ({ signal }) => fetchDashboard(symbol, signal),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !needsRedirect,
  });

  if (needsRedirect) {
    return <Navigate to={`/dashboard/${symbol}`} replace />;
  }

  return (
    <div className="dbg">
      <div className="bg-grid" />

      <div className="dash-grid">
        <main className="main">
          <div className="topbar">
            <SearchBar />
            <div className="topbar-meta" data-testid="last-updated">
              <span className="pulse" />
              <span>{t("dashboard.lastUpdated", { date: formatLastUpdated(data?.asOf) })}</span>
            </div>
          </div>

          {isPending && (
            <div className="card state-card">
              {t("dashboard.loadingTicker", { ticker })}
            </div>
          )}

          {!isPending && error && (
            <div className="card state-card">
              <div>
                {t("dashboard.couldntLoad", { ticker })}
                <br />
                {error instanceof Error ? error.message : t("common.somethingWentWrong")}
              </div>
              <button
                type="button"
                className="state-retry"
                onClick={() => refetch()}
              >
                {t("dashboard.retry")}
              </button>
            </div>
          )}

          {data && !error && (
            <div
              data-testid="dashboard-loaded"
              data-fetching={isFetching ? "true" : "false"}
            >
              <TickerHero data={data} symbol={symbol} />
              <CombosSection combos={data.combos} />
              <ChartCard data={data} />
            </div>
          )}
        </main>

        {/* Watchlist lives in its own `/watchlist` screen on mobile (bottom tab),
            so the dashboard only embeds it as a sidebar at ≥768px. */}
        {!isMobile && (
          <aside className="watchlist-panel">
            <Watchlist activeSymbol={symbol} />
          </aside>
        )}
      </div>
    </div>
  );
}

function TickerHero({ data, symbol }: { data: DashboardResponse; symbol: string }) {
  const { t } = useTranslation();
  const { query, add, remove } = useWatchlist();
  const positive = data.priceChange >= 0;
  const sign = data.priceChangePct >= 0 ? "+" : "";
  const last = data.priceHistory[data.priceHistory.length - 1];
  const prev = data.priceHistory[data.priceHistory.length - 2];
  const { currency } = data;

  const inWatchlist = (query.data?.tickers ?? []).some((tk) => tk.symbol === symbol);
  const pending =
    (add.isPending && add.variables === symbol) ||
    (remove.isPending && remove.variables === symbol);

  function toggleWatchlist() {
    if (pending) return;
    if (inWatchlist) remove.mutate(symbol);
    else add.mutate(symbol);
  }

  const label = pending
    ? inWatchlist
      ? t("dashboard.removing")
      : t("dashboard.adding")
    : inWatchlist
      ? t("dashboard.removeFromWatchlist")
      : t("dashboard.addToWatchlist");

  return (
    <div className="card ticker-card" data-testid="ticker-hero">
      <button
        type="button"
        onClick={toggleWatchlist}
        disabled={pending || query.isPending}
        className={`wl-toggle${inWatchlist ? " in" : ""}`}
        data-testid="watchlist-toggle"
        data-in-watchlist={inWatchlist ? "true" : "false"}
        aria-pressed={inWatchlist}
      >
        <span className="wl-toggle-icon" aria-hidden>
          {inWatchlist ? "−" : "+"}
        </span>
        {label}
      </button>
      <div className="ticker-head">
        <span className="ticker-symbol">{data.ticker}</span>
        <span className={`mkt-badge mkt-${marketBadge(data.exchange).toLowerCase()}`}>
          {marketBadge(data.exchange)}
        </span>
        <span className="ticker-sep">·</span>
        <span className="ticker-name">{data.name}</span>
      </div>
      <div className="ticker-pricing">
        <span className="ticker-price">
          {formatPrice(data.currentPrice, currency)}
        </span>
        <span className={`ticker-chg${positive ? "" : " down"}`}>
          <span className="arrow" />
          {sign}
          {data.priceChange.toFixed(2)} ({sign}
          {data.priceChangePct.toFixed(2)}%)
        </span>
      </div>
      <div className="ticker-meta">
        <div className="meta-cell">
          <div className="label">{t("dashboard.open")}</div>
          <div className="value">
            {last ? formatPrice(last.open, currency) : "—"}
          </div>
        </div>
        <div className="meta-cell">
          <div className="label">{t("dashboard.dayRange")}</div>
          <div className="value">
            {last ? `${last.low.toFixed(2)} – ${last.high.toFixed(2)}` : "—"}
          </div>
        </div>
        <div className="meta-cell">
          <div className="label">{t("dashboard.volume")}</div>
          <div className="value">{formatVolume(last?.volume)}</div>
        </div>
        <div className="meta-cell">
          <div className="label">{t("dashboard.prevClose")}</div>
          <div className="value">
            {prev ? formatPrice(prev.close, currency) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function CombosSection({ combos }: { combos: ComboStatus[] }) {
  const { t } = useTranslation();
  return (
    <div className="card combos-card" data-testid="combos-section">
      <div className="card-head">
        <span className="card-title">{t("combos.yourCombos")}</span>
        <Link to="/indicators" className="card-action">
          {t("combos.manage")}
        </Link>
      </div>

      {combos.length === 0 ? (
        <div className="combos-empty" data-testid="combos-empty">
          {t("combos.emptyDashboard")}{" "}
          <Link to="/indicators">{t("combos.createInIndicators")}</Link>
        </div>
      ) : (
        combos.map((combo) => <ComboRow key={combo.comboId} combo={combo} />)
      )}
    </div>
  );
}

function ComboRow({ combo }: { combo: ComboStatus }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const triggeredCount = combo.indicators.filter((i) => i.triggered).length;
  const totalCount = combo.indicators.length;
  const conditions = combo.indicators
    .map((i) => i.abbreviation || i.label)
    .join(", ");

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`combo-row${combo.green ? " green" : ""}`}
        data-testid="combo-row"
        data-combo-id={combo.comboId}
        data-green={combo.green ? "true" : "false"}
      >
        <span className="combo-status-dot" aria-hidden />
        <div className="combo-body">
          <div className="combo-name">{combo.name}</div>
          <div className="combo-detail">
            {t("combos.conditionsTriggered", {
              triggered: triggeredCount,
              total: totalCount,
            })}
            {conditions ? ` · ${conditions}` : ""}
          </div>
        </div>
        <span className="combo-flag">
          {combo.green ? t("combos.triggered") : t("combos.notTriggered")}
        </span>
      </button>

      {expanded && (
        <div className="combo-detail-list" data-testid="combo-detail">
          {combo.indicators.length === 0 && (
            <div className="wl-hint">{t("combos.empty")}</div>
          )}
          {combo.indicators.map((ind) => (
            <div
              key={ind.indicatorId}
              className={`combo-ind ${ind.triggered ? "on" : "off"}`}
              data-testid="combo-indicator"
              data-triggered={ind.triggered ? "true" : "false"}
            >
              <span className="mark" aria-hidden>
                {ind.triggered ? "✓" : "✗"}
              </span>
              <div className="ind-label">
                {ind.label}
                <span className="ind-tf">{TIMEFRAME_LABELS[ind.timeframe]}</span>
                {ind.abbreviation && (
                  <span className="ind-abbr"> · {ind.abbreviation}</span>
                )}
              </div>
              <div className="ind-value">{ind.displayValue}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ChartCard({ data }: { data: DashboardResponse }) {
  return <PriceChart priceChart={data.priceChart} />;
}
