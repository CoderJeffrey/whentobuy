import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface EmailComboMatch {
  comboId: string;
  name: string;
}

export interface EmailTickerReady {
  ticker: string;
  name: string;
  dataReady: true;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  greenCombos: EmailComboMatch[];
  totalCombos: number;
}

export interface EmailTickerPending {
  ticker: string;
  name: string;
  dataReady: false;
}

export type EmailTickerData = EmailTickerReady | EmailTickerPending;

export interface DailyDigestProps {
  tickers: EmailTickerData[];
  unsubscribeUrl: string;
  appUrl: string;
  dateLabel: string;
  /** Total watchlist size; when > tickers.length we add an "Explore more" CTA. */
  watchlistTotal?: number;
}

const COLORS = {
  bgPage: "#0F0F0E",
  bgCard: "#18181a",
  bgCardRaised: "#1f1f22",
  border: "#2a2a2d",
  borderStrong: "#35353a",
  textPrimary: "#edeae4",
  textSecondary: "#9a968f",
  textTertiary: "#61605c",
  accent: "#c9b896",
  positive: "#7a9a7d",
  negative: "#a66b6b",
};

const FONT_HEADING = "Georgia, 'Times New Roman', serif";
const FONT_BODY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "'SF Mono', Monaco, 'Courier New', monospace";

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        padding: "20px 24px",
        marginBottom: "12px",
      }}
    >
      {children}
    </Section>
  );
}

function TickerHeader({ ticker, name }: { ticker: string; name: string }) {
  return (
    <Text
      style={{
        fontFamily: FONT_MONO,
        color: COLORS.textPrimary,
        fontSize: "16px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        margin: 0,
      }}
    >
      {ticker}
      <span
        style={{
          color: COLORS.textTertiary,
          fontWeight: 400,
          marginLeft: "8px",
        }}
      >
        · {name}
      </span>
    </Text>
  );
}

function PendingTickerCard({ data }: { data: EmailTickerPending }) {
  return (
    <CardShell>
      <Row>
        <Column>
          <TickerHeader ticker={data.ticker} name={data.name} />
        </Column>
      </Row>
      <Text
        style={{
          fontFamily: FONT_BODY,
          color: COLORS.textTertiary,
          fontSize: "12px",
          textAlign: "center" as const,
          margin: "20px 0 4px",
          fontStyle: "italic" as const,
        }}
      >
        Data not available
      </Text>
    </CardShell>
  );
}

function ComboMatches({
  greenCombos,
  appUrl,
  ticker,
}: {
  greenCombos: EmailComboMatch[];
  appUrl: string;
  ticker: string;
}) {
  if (greenCombos.length === 0) {
    return (
      <Text
        style={{
          fontFamily: FONT_BODY,
          color: COLORS.textTertiary,
          fontSize: "12px",
          margin: "14px 0 4px",
          textAlign: "center" as const,
          fontStyle: "italic" as const,
        }}
      >
        No combos triggered today.
      </Text>
    );
  }
  return (
    <Section style={{ margin: "14px 0 4px" }}>
      <Text
        style={{
          fontFamily: FONT_BODY,
          color: COLORS.positive,
          fontSize: "13px",
          margin: "0 0 6px",
        }}
      >
        ✓ {greenCombos.length}{" "}
        {greenCombos.length === 1 ? "combo" : "combos"} triggered:
      </Text>
      {greenCombos.map((c) => (
        <Text
          key={c.comboId}
          style={{
            fontFamily: FONT_BODY,
            color: COLORS.textPrimary,
            fontSize: "13px",
            margin: "2px 0",
            paddingLeft: "12px",
          }}
        >
          • {c.name}
        </Text>
      ))}
      <Section style={{ marginTop: "12px", textAlign: "center" as const }}>
        <Button
          href={`${appUrl}/dashboard/${ticker}`}
          style={{
            backgroundColor: COLORS.bgCardRaised,
            border: `1px solid ${COLORS.borderStrong}`,
            color: COLORS.accent,
            fontFamily: FONT_BODY,
            fontSize: "11px",
            letterSpacing: "0.06em",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          View on indicatorhub.dev →
        </Button>
      </Section>
    </Section>
  );
}

function ReadyTickerCard({
  data,
  appUrl,
}: {
  data: EmailTickerReady;
  appUrl: string;
}) {
  const positive = data.priceChange >= 0;
  const arrow = positive ? "▲" : "▼";
  const sign = data.priceChangePct >= 0 ? "+" : "";

  return (
    <CardShell>
      <Row>
        <Column>
          <TickerHeader ticker={data.ticker} name={data.name} />
          <Text
            style={{
              fontFamily: FONT_MONO,
              color: COLORS.textPrimary,
              fontSize: "20px",
              margin: "6px 0 0",
            }}
          >
            ${data.currentPrice.toFixed(2)}
            <span
              style={{
                color: positive ? COLORS.positive : COLORS.negative,
                fontSize: "13px",
                marginLeft: "10px",
              }}
            >
              {arrow} {sign}
              {data.priceChangePct.toFixed(2)}%
            </span>
          </Text>
        </Column>
      </Row>

      <ComboMatches
        greenCombos={data.greenCombos}
        appUrl={appUrl}
        ticker={data.ticker}
      />
    </CardShell>
  );
}

function TickerCard({
  data,
  appUrl,
}: {
  data: EmailTickerData;
  appUrl: string;
}) {
  if (!data.dataReady) {
    return <PendingTickerCard data={data} />;
  }
  return <ReadyTickerCard data={data} appUrl={appUrl} />;
}

function ExploreMoreCta({ appUrl }: { appUrl: string }) {
  return (
    <Section style={{ textAlign: "center" as const, margin: "8px 0 24px" }}>
      <Button
        href={appUrl}
        style={{
          backgroundColor: COLORS.bgCardRaised,
          border: `1px solid ${COLORS.borderStrong}`,
          color: COLORS.accent,
          fontFamily: FONT_BODY,
          fontSize: "12px",
          letterSpacing: "0.08em",
          padding: "12px 22px",
          borderRadius: "10px",
          textDecoration: "none",
        }}
      >
        Explore more on indicatorhub →
      </Button>
    </Section>
  );
}

export function DailyDigest({
  tickers,
  unsubscribeUrl,
  appUrl,
  dateLabel,
  watchlistTotal,
}: DailyDigestProps) {
  const hasMore =
    typeof watchlistTotal === "number" && watchlistTotal > tickers.length;
  return (
    <Html>
      <Head />
      <Preview>Your daily watchlist update — {dateLabel}</Preview>
      <Body
        style={{
          backgroundColor: COLORS.bgPage,
          fontFamily: FONT_BODY,
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <Section style={{ textAlign: "center" as const, padding: "16px 0 24px" }}>
            <Text
              style={{
                fontFamily: FONT_HEADING,
                color: COLORS.textPrimary,
                fontSize: "24px",
                fontWeight: 500,
                margin: "0 0 4px",
              }}
            >
              IndicatorHub
            </Text>
            <Text
              style={{
                fontFamily: FONT_BODY,
                color: COLORS.textSecondary,
                fontSize: "13px",
                margin: 0,
              }}
            >
              Your daily watchlist update
            </Text>
            <Text
              style={{
                fontFamily: FONT_MONO,
                color: COLORS.textTertiary,
                fontSize: "11px",
                letterSpacing: "0.08em",
                margin: "4px 0 0",
              }}
            >
              {dateLabel}
            </Text>
          </Section>

          {tickers.map((t) => (
            <TickerCard key={t.ticker} data={t} appUrl={appUrl} />
          ))}

          {hasMore && <ExploreMoreCta appUrl={appUrl} />}

          <Hr
            style={{
              borderColor: COLORS.border,
              margin: "32px 0 16px",
            }}
          />

          <Section style={{ textAlign: "center" as const, padding: "8px 16px 24px" }}>
            <Text
              style={{
                fontFamily: FONT_BODY,
                color: COLORS.textTertiary,
                fontSize: "11px",
                margin: "0 0 12px",
              }}
            >
              You're receiving this because you signed up for daily updates.
            </Text>
            <Link
              href={unsubscribeUrl}
              style={{
                color: COLORS.textSecondary,
                fontFamily: FONT_BODY,
                fontSize: "12px",
                textDecoration: "underline",
              }}
            >
              Unsubscribe
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DailyDigest;
