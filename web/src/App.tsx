import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "./lib/api";
import { ScoreCard } from "./components/ScoreCard";
import { BreakdownCard } from "./components/BreakdownCard";
import { PriceChart } from "./components/PriceChart";

function formatAsOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function Header({ asOf }: { asOf?: string }) {
  return (
    <header className="flex items-center justify-between py-6">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--gold)" }}
      >
        Should I Buy Now?
      </h1>
      {asOf && (
        <div
          className="text-sm font-mono"
          style={{ color: "var(--text-muted)" }}
          data-testid="as-of"
        >
          Last updated: {formatAsOf(asOf)}
        </div>
      )}
    </header>
  );
}

export default function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <Header asOf={data?.asOf} />

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
            <BreakdownCard score={data.score} />
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
