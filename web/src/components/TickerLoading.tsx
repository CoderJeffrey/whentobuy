import { useEffect, useState } from "react";

const MESSAGES = [
  "Fetching price history…",
  "Computing indicators…",
  "Almost done…",
];

export function TickerLoading({
  ticker,
  name,
}: {
  ticker: string;
  name?: string;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="rounded-2xl p-12 flex flex-col items-center gap-6"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      data-testid="ticker-loading"
      data-ticker={ticker}
    >
      <div className="flex flex-col items-center gap-1">
        <h2
          className="text-4xl font-bold tracking-tight"
          style={{ color: "var(--gold)" }}
        >
          {ticker}
        </h2>
        {name && (
          <div
            className="text-sm uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {name}
          </div>
        )}
      </div>

      <div
        className="rounded-xl p-8 w-full max-w-md flex flex-col items-center gap-4"
        style={{
          backgroundColor: "var(--bg-card-hover)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="text-2xl"
          aria-hidden
          style={{ animation: "pulse 1.6s ease-in-out infinite" }}
        >
          ⏳
        </div>
        <div
          className="text-sm font-medium text-center"
          data-testid="ticker-loading-message"
          aria-live="polite"
        >
          {MESSAGES[idx]}
        </div>
        <div
          className="text-xs text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Fetching 3 years of price history from Yahoo.
          <br />
          This only happens once. Usually 3–8 seconds.
        </div>
      </div>
    </section>
  );
}
