import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function TickerLoading({
  ticker,
  name,
}: {
  ticker: string;
  name?: string;
}) {
  const { t } = useTranslation();
  const messages = [
    t("tickerLoading.fetchingHistory"),
    t("tickerLoading.computingIndicators"),
    t("tickerLoading.almostDone"),
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <section
      className="rounded-2xl p-12 flex flex-col items-center gap-8"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      data-testid="ticker-loading"
      data-ticker={ticker}
    >
      <div className="flex flex-col items-center gap-2">
        <h2
          className="text-4xl tracking-tight"
          style={{ color: "var(--accent)", fontWeight: 500 }}
        >
          {ticker}
        </h2>
        {name && (
          <div
            className="text-xs uppercase tracking-label"
            style={{ color: "var(--text-secondary)" }}
          >
            {name}
          </div>
        )}
      </div>

      <div
        className="rounded-xl p-8 w-full max-w-md flex flex-col items-center gap-4"
        style={{
          backgroundColor: "var(--bg-card-raised)",
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
          className="text-sm text-center"
          data-testid="ticker-loading-message"
          aria-live="polite"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          {messages[idx]}
        </div>
        <div
          className="text-xs text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("tickerLoading.detail")}
        </div>
      </div>
    </section>
  );
}
