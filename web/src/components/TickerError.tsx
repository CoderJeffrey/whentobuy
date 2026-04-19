import { Link } from "react-router-dom";
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
  const apiErr = error as Partial<ApiError> | null;
  const code = apiErr?.code ?? "INTERNAL";
  const message = apiErr?.message ?? "Unknown error";

  if (code === "TICKER_NOT_FOUND") {
    return (
      <Wrap testId="ticker-error-not-found" border="var(--rating-immediate_sell)">
        <Title>❌ Ticker Not Found</Title>
        <Body>
          <span className="font-mono">"{ticker}"</span> isn't a valid ticker, or
          it may be delisted.
        </Body>
        <Actions>
          <BackToAaplLink />
        </Actions>
      </Wrap>
    );
  }

  if (code === "RATE_LIMITED") {
    return (
      <Wrap testId="ticker-error-rate-limit" border="var(--rating-hold)">
        <Title>⏸ Yahoo Rate Limit Hit</Title>
        <Body>
          We're being throttled by Yahoo Finance. Try again in a minute.
        </Body>
        <Actions>
          <RetryButton onClick={onRetry} />
          <BackToAaplLink />
        </Actions>
      </Wrap>
    );
  }

  return (
    <Wrap testId="ticker-error-network" border="var(--rating-immediate_sell)">
      <Title>⚠ Something Went Wrong</Title>
      <Body>
        Couldn't load data for {ticker}.
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
  return <h2 className="text-2xl font-semibold">{children}</h2>;
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-sm max-w-md"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 mt-2">{children}</div>;
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-md text-sm font-semibold"
      style={{ backgroundColor: "var(--gold)", color: "#0a0a0a" }}
      data-testid="ticker-error-retry"
    >
      Retry
    </button>
  );
}

function BackToAaplLink() {
  return (
    <Link
      to="/ticker/AAPL"
      className="px-4 py-2 rounded-md text-sm font-semibold"
      style={{
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      }}
      data-testid="ticker-error-back"
    >
      Back to AAPL
    </Link>
  );
}
