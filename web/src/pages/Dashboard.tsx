import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchDashboard } from "../lib/api";
import { NavBar } from "../components/NavBar";
import { PriceChart } from "../components/PriceChart";
import { TickerError } from "../components/TickerError";
import { TickerLoading } from "../components/TickerLoading";
import { Watchlist } from "../components/Watchlist";
import type { ComboStatus, DashboardResponse } from "../types";

export default function Dashboard() {
  const { symbol } = useParams<{ symbol: string }>();
  const ticker = (symbol ?? "AAPL").toUpperCase();

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", ticker],
    queryFn: ({ signal }) => fetchDashboard(ticker, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <div className="max-w-7xl mx-auto px-6">
      <NavBar asOf={data?.asOf} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-6 pb-12">
        <main className="min-w-0">
          {isPending && <TickerLoading ticker={ticker} />}

          {!isPending && error && (
            <TickerError
              ticker={ticker}
              error={error}
              onRetry={() => refetch()}
            />
          )}

          {data && !error && (
            <div
              className="flex flex-col gap-8"
              data-testid="dashboard-loaded"
              data-fetching={isFetching ? "true" : "false"}
            >
              <TickerHero data={data} />
              <CombosSection combos={data.combos} />
              <PriceChart
                priceHistory={data.priceHistory}
                sma200Series={data.sma200Series}
              />
            </div>
          )}
        </main>

        <div className="md:sticky md:top-4 md:self-start">
          <Watchlist activeTicker={ticker} />
        </div>
      </div>
    </div>
  );
}

function TickerHero({ data }: { data: DashboardResponse }) {
  const positive = data.priceChange >= 0;
  const arrow = positive ? "▲" : "▼";
  const sign = data.priceChangePct >= 0 ? "+" : "";
  return (
    <section
      className="rounded-2xl p-8 flex flex-col gap-2"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      data-testid="ticker-hero"
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="font-mono text-2xl"
          style={{ color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}
        >
          {data.ticker}
        </span>
        <span
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          · {data.name}
        </span>
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="font-mono text-3xl"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          ${data.currentPrice.toFixed(2)}
        </span>
        <span
          className="font-mono text-sm"
          style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
        >
          {arrow} {sign}
          {data.priceChange.toFixed(2)} ({sign}
          {data.priceChangePct.toFixed(2)}%)
        </span>
      </div>
    </section>
  );
}

function CombosSection({ combos }: { combos: ComboStatus[] }) {
  return (
    <section
      className="rounded-2xl p-6 sm:p-8 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      data-testid="combos-section"
    >
      <div className="flex items-baseline justify-between">
        <h2
          className="text-[11px] tracking-label uppercase"
          style={{ color: "var(--text-secondary)", fontWeight: 500 }}
        >
          Your Combos
        </h2>
        <Link
          to="/indicators"
          className="text-[11px] tracking-label uppercase"
          style={{ color: "var(--accent)" }}
        >
          Manage →
        </Link>
      </div>

      {combos.length === 0 ? (
        <div
          className="py-10 text-center text-sm rounded-xl"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-card-raised)",
            border: "1px dashed var(--border)",
          }}
          data-testid="combos-empty"
        >
          No combos yet.{" "}
          <Link
            to="/indicators"
            style={{ color: "var(--accent)" }}
          >
            Create one in the Indicators tab →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {combos.map((combo) => (
            <ComboRow key={combo.comboId} combo={combo} />
          ))}
        </div>
      )}
    </section>
  );
}

function ComboRow({ combo }: { combo: ComboStatus }) {
  const [expanded, setExpanded] = useState(false);
  const triggeredCount = combo.indicators.filter((i) => i.triggered).length;
  const totalCount = combo.indicators.length;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card-raised)",
        border: `1px solid ${combo.green ? "color-mix(in srgb, var(--positive) 50%, var(--border))" : "var(--border)"}`,
      }}
      data-testid="combo-row"
      data-combo-id={combo.comboId}
      data-green={combo.green ? "true" : "false"}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-4 flex items-center gap-3 text-left transition-colors"
        aria-expanded={expanded}
      >
        <span
          aria-hidden
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor: combo.green
              ? "var(--positive)"
              : "var(--text-tertiary)",
            boxShadow: combo.green
              ? "0 0 0 3px color-mix(in srgb, var(--positive) 18%, transparent)"
              : "none",
          }}
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-sm truncate"
            style={{ color: "var(--text-primary)", fontWeight: 500 }}
          >
            {combo.name}
          </div>
          <div
            className="text-[11px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {triggeredCount} / {totalCount} triggered
          </div>
        </div>
        <span
          className="text-[11px] tracking-label uppercase font-mono shrink-0"
          style={{
            color: combo.green ? "var(--positive)" : "var(--text-tertiary)",
            fontWeight: combo.green ? 600 : 400,
          }}
        >
          {combo.green ? "GREEN" : "not green"}
        </span>
        <span
          aria-hidden
          className="text-xs shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        >
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 pt-1 flex flex-col gap-2"
          data-testid="combo-detail"
        >
          {combo.indicators.length === 0 && (
            <div
              className="text-xs italic"
              style={{ color: "var(--text-tertiary)" }}
            >
              No indicators in this combo.
            </div>
          )}
          {combo.indicators.map((ind) => (
            <div
              key={ind.indicatorId}
              className="flex items-center gap-3 rounded-md px-3 py-2"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
              data-testid="combo-indicator"
              data-triggered={ind.triggered ? "true" : "false"}
            >
              <span
                aria-hidden
                className="font-mono text-sm shrink-0"
                style={{
                  color: ind.triggered
                    ? "var(--positive)"
                    : "var(--text-tertiary)",
                  width: "1ch",
                }}
              >
                {ind.triggered ? "✓" : "✗"}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm"
                  style={{
                    color: ind.triggered
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {ind.label}
                </div>
                {ind.abbreviation && (
                  <div
                    className="text-[10px] font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {ind.abbreviation}
                  </div>
                )}
              </div>
              <div
                className="font-mono text-xs shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              >
                {ind.displayValue}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
