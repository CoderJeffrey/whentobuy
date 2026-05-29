import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { fetchDashboard } from "../lib/api";
import { PriceChart } from "../components/PriceChart";
import { SearchBar } from "../components/SearchBar";
import { Watchlist } from "../components/Watchlist";
import { formatPrice, formatSymbol, marketBadge, parseSymbol } from "../lib/symbol";
import type { ComboStatus, DashboardResponse } from "../types";
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
              <span>Last updated · {formatLastUpdated(data?.asOf)}</span>
            </div>
          </div>

          {isPending && (
            <div className="card state-card">
              Loading <span className="state-tk">{ticker}</span>…
            </div>
          )}

          {!isPending && error && (
            <div className="card state-card">
              <div>
                Couldn’t load <span className="state-tk">{ticker}</span>.
                <br />
                {error instanceof Error ? error.message : "Something went wrong."}
              </div>
              <button
                type="button"
                className="state-retry"
                onClick={() => refetch()}
              >
                Retry →
              </button>
            </div>
          )}

          {data && !error && (
            <div
              data-testid="dashboard-loaded"
              data-fetching={isFetching ? "true" : "false"}
            >
              <TickerHero data={data} />
              <CombosSection combos={data.combos} />
              <ChartCard data={data} />
            </div>
          )}
        </main>

        <aside className="watchlist-panel">
          <Watchlist activeSymbol={symbol} />
        </aside>
      </div>
    </div>
  );
}

function TickerHero({ data }: { data: DashboardResponse }) {
  const positive = data.priceChange >= 0;
  const sign = data.priceChangePct >= 0 ? "+" : "";
  const last = data.priceHistory[data.priceHistory.length - 1];
  const prev = data.priceHistory[data.priceHistory.length - 2];
  const { currency } = data;

  return (
    <div className="card ticker-card" data-testid="ticker-hero">
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
          <div className="label">Open</div>
          <div className="value">
            {last ? formatPrice(last.open, currency) : "—"}
          </div>
        </div>
        <div className="meta-cell">
          <div className="label">Day range</div>
          <div className="value">
            {last ? `${last.low.toFixed(2)} – ${last.high.toFixed(2)}` : "—"}
          </div>
        </div>
        <div className="meta-cell">
          <div className="label">Volume</div>
          <div className="value">{formatVolume(last?.volume)}</div>
        </div>
        <div className="meta-cell">
          <div className="label">Prev close</div>
          <div className="value">
            {prev ? formatPrice(prev.close, currency) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function CombosSection({ combos }: { combos: ComboStatus[] }) {
  return (
    <div className="card combos-card" data-testid="combos-section">
      <div className="card-head">
        <span className="card-title">Your combos</span>
        <Link to="/indicators" className="card-action">
          MANAGE →
        </Link>
      </div>

      {combos.length === 0 ? (
        <div className="combos-empty" data-testid="combos-empty">
          No combos yet.{" "}
          <Link to="/indicators">Create one in the Indicators tab →</Link>
        </div>
      ) : (
        combos.map((combo) => <ComboRow key={combo.comboId} combo={combo} />)
      )}
    </div>
  );
}

function ComboRow({ combo }: { combo: ComboStatus }) {
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
            {triggeredCount} / {totalCount} conditions triggered
            {conditions ? ` · ${conditions}` : ""}
          </div>
        </div>
        <span className="combo-flag">
          {combo.green ? "TRIGGERED →" : "NOT TRIGGERED →"}
        </span>
      </button>

      {expanded && (
        <div className="combo-detail-list" data-testid="combo-detail">
          {combo.indicators.length === 0 && (
            <div className="wl-hint">No indicators in this combo.</div>
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
  return (
    <PriceChart
      priceHistory={data.priceHistory}
      sma200Series={data.sma200Series}
    />
  );
}
