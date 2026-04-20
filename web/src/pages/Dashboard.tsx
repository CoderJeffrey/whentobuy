import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchDashboard } from "../lib/api";
import { IndicatorsSection } from "../components/IndicatorsSection";
import { NavBar } from "../components/NavBar";
import { PriceChart } from "../components/PriceChart";
import { ScoreCard } from "../components/ScoreCard";
import { TickerError } from "../components/TickerError";
import { TickerLoading } from "../components/TickerLoading";
import { Watchlist } from "../components/Watchlist";

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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <NavBar asOf={data?.asOf} />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 pb-12">
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
                <ScoreCard data={data} />
                <IndicatorsSection data={data} />
                <PriceChart
                  priceHistory={data.priceHistory}
                  sma200Series={data.sma200Series}
                />
              </div>
            )}
          </main>

          <div className="hidden md:block xl:sticky xl:top-4 xl:self-start">
            <Watchlist activeTicker={ticker} />
          </div>
        </div>
      </div>
    </div>
  );
}
