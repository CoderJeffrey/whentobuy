import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../lib/api";
import { IndicatorsSection } from "../components/IndicatorsSection";
import { NavBar } from "../components/NavBar";
import { PriceChart } from "../components/PriceChart";
import { ScoreCard } from "../components/ScoreCard";

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <NavBar asOf={data?.asOf} />

        {isLoading && (
          <div
            className="rounded-2xl p-16 text-center"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            data-testid="loading"
          >
            Loading dashboard…
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--rating-immediate_sell)",
              color: "var(--rating-immediate_sell)",
            }}
            data-testid="error"
          >
            <div className="font-semibold mb-2">Failed to load dashboard</div>
            <div
              className="text-sm font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-6 pb-12">
            <ScoreCard data={data} />
            <IndicatorsSection data={data} />
            <PriceChart
              priceHistory={data.priceHistory}
              sma200Series={data.sma200Series}
            />
          </div>
        )}
      </div>
    </div>
  );
}
