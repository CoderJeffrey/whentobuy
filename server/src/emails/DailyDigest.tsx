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
import type { Rating } from "../types.js";

export interface EmailTickerReady {
  ticker: string;
  name: string;
  dataReady: true;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  percentage: number;
  rating: Rating;
  scoreTotal: number;
  scoreMax: number;
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

const RATING_LABELS: Record<Rating, string> = {
  immediate_sell: "Don't Buy",
  weak_sell: "Probably Not",
  hold: "Hold",
  weak_buy: "Weak Buy",
  strong_buy: "Strong Buy",
};

const SEGMENT_COLORS: Record<Rating, string> = {
  immediate_sell: "#8b3a3a",
  weak_sell: "#a65d5d",
  hold: "#9c8547",
  weak_buy: "#6b8a6d",
  strong_buy: "#4c7a57",
};

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

function RatingBlock({
  percentage,
  rating,
  scoreTotal,
  scoreMax,
}: {
  percentage: number;
  rating: Rating;
  scoreTotal: number;
  scoreMax: number;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const ratingColor = SEGMENT_COLORS[rating];

  return (
    <Section style={{ margin: "16px 0 4px", textAlign: "center" as const }}>
      <Text
        style={{
          fontFamily: FONT_HEADING,
          color: ratingColor,
          fontSize: "26px",
          fontWeight: 500,
          margin: "0 0 4px",
          textAlign: "center" as const,
          letterSpacing: "0.01em",
        }}
      >
        {RATING_LABELS[rating]}
      </Text>
      <Text
        style={{
          fontFamily: FONT_MONO,
          color: COLORS.textTertiary,
          fontSize: "12px",
          letterSpacing: "0.04em",
          margin: 0,
          textAlign: "center" as const,
        }}
      >
        {scoreTotal} / {scoreMax} · {clamped}%
      </Text>
    </Section>
  );
}

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

function ReadyTickerCard({ data }: { data: EmailTickerReady }) {
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

      <RatingBlock
        percentage={data.percentage}
        rating={data.rating}
        scoreTotal={data.scoreTotal}
        scoreMax={data.scoreMax}
      />
    </CardShell>
  );
}

function TickerCard({ data }: { data: EmailTickerData }) {
  if (!data.dataReady) {
    return <PendingTickerCard data={data} />;
  }
  return <ReadyTickerCard data={data} />;
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
            <TickerCard key={t.ticker} data={t} />
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
