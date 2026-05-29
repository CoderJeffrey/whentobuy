import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ApiError } from "../types";

export function TickerError({
  ticker,
  error,
  onRetry,
}: {
  ticker: string;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const apiErr = error as Partial<ApiError> | null;
  const code = apiErr?.code ?? "INTERNAL";
  const message = apiErr?.message ?? t("tickerError.unknownError");

  if (code === "TICKER_NOT_FOUND") {
    return (
      <Wrap testId="ticker-error-not-found" border="var(--negative)">
        <Title>{t("tickerError.notFoundTitle")}</Title>
        <Body>{t("tickerError.notFoundBody", { ticker })}</Body>
        <Actions>
          <BackToAaplLink />
        </Actions>
      </Wrap>
    );
  }

  if (code === "RATE_LIMITED") {
    return (
      <Wrap testId="ticker-error-rate-limit" border="var(--rating-hold)">
        <Title>{t("tickerError.rateLimitTitle")}</Title>
        <Body>{t("tickerError.rateLimitBody")}</Body>
        <Actions>
          <RetryButton onClick={onRetry} />
          <BackToAaplLink />
        </Actions>
      </Wrap>
    );
  }

  return (
    <Wrap testId="ticker-error-network" border="var(--negative)">
      <Title>{t("tickerError.genericTitle")}</Title>
      <Body>
        {t("tickerError.genericBody", { ticker })}
        <div
          className="mt-2 text-xs font-mono break-words"
          style={{ color: "var(--text-muted)" }}
        >
          {message}
        </div>
      </Body>
      <Actions>
        <RetryButton onClick={onRetry} />
        <BackToAaplLink />
      </Actions>
    </Wrap>
  );
}

function Wrap({
  testId,
  border,
  children,
}: {
  testId: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-10 flex flex-col items-center gap-5 text-center"
      style={{
        backgroundColor: "var(--bg-card)",
        border: `1px solid ${border}`,
      }}
      data-testid={testId}
    >
      {children}
    </section>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-2xl tracking-tight"
      style={{ color: "var(--text-primary)", fontWeight: 500 }}
    >
      {children}
    </h2>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-sm max-w-md"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 mt-2">{children}</div>;
}

function RetryButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-md text-sm"
      style={{
        backgroundColor: "var(--accent)",
        color: "var(--bg-page)",
        fontWeight: 500,
      }}
      data-testid="ticker-error-retry"
    >
      {t("common.retry")}
    </button>
  );
}

function BackToAaplLink() {
  const { t } = useTranslation();
  return (
    <Link
      to="/ticker/AAPL"
      className="px-4 py-2 rounded-md text-sm"
      style={{
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
        fontWeight: 500,
      }}
      data-testid="ticker-error-back"
    >
      {t("tickerError.backToAapl")}
    </Link>
  );
}
