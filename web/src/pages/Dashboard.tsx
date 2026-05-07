import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchConfig, fetchDashboard } from "../lib/api";
import { deriveLiveScore } from "../lib/score";
import { IndicatorsSection } from "../components/IndicatorsSection";
import { NavBar } from "../components/NavBar";
import { PriceChart } from "../components/PriceChart";
import { ScoreCard } from "../components/ScoreCard";
import { TickerError } from "../components/TickerError";
import { TickerLoading } from "../components/TickerLoading";
import { Watchlist } from "../components/Watchlist";
import type { DashboardResponse } from "../types";

export default function Dashboard() {
  const { symbol } = useParams<{ symbol: string }>();
  const ticker = (symbol ?? "AAPL").toUpperCase();

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", ticker],
    queryFn: ({ signal }) => fetchDashboard(ticker, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const configQ = useQuery({ queryKey: ["config"], queryFn: fetchConfig });

  const liveData = useMemo<DashboardResponse | undefined>(() => {
    if (!data) return data;
    const weights = configQ.data?.weights;
    if (!weights) return data;
    return { ...data, score: deriveLiveScore(weights, data.score.breakdown) };
  }, [data, configQ.data]);

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

          {liveData && !error && (
            <div
              className="flex flex-col gap-8"
              data-testid="dashboard-loaded"
              data-fetching={isFetching ? "true" : "false"}
            >
              <ScoreCard data={liveData} />
              <IndicatorsSection data={liveData} />
              <PriceChart
                priceHistory={liveData.priceHistory}
                sma200Series={liveData.sma200Series}
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
