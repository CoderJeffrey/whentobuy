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

export interface EmailTickerData {
  ticker: string;
  name: string;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  percentage: number;
  rating: Rating;
  triggeredCount: number;
  totalCount: number;
}

export interface DailyDigestProps {
  tickers: EmailTickerData[];
  unsubscribeUrl: string;
  appUrl: string;
  dateLabel: string;
}

const RATING_LABELS: Record<Rating, string> = {
  immediate_sell: "DON'T BUY",
  weak_sell: "PROBABLY NOT",
  hold: "HOLD",
  weak_buy: "WORTH CONSIDERING",
  strong_buy: "STRONG BUY",
};

const SEGMENT_COLORS: Record<Rating, string> = {
  immediate_sell: "#8b3a3a",
  weak_sell: "#a65d5d",
  hold: "#9c8547",
  weak_buy: "#6b8a6d",
  strong_buy: "#4c7a57",
};

const SEGMENTS: Rating[] = [
  "immediate_sell",
  "weak_sell",
  "hold",
  "weak_buy",
  "strong_buy",
];

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

function activeSegmentIndex(percentage: number): number {
  if (percentage >= 80) return 4;
  if (percentage >= 60) return 3;
  if (percentage >= 40) return 2;
  if (percentage >= 20) return 1;
  return 0;
}

function GaugeBar({
  percentage,
  rating,
}: {
  percentage: number;
  rating: Rating;
}) {
  const activeIdx = activeSegmentIndex(percentage);
  return (
    <Section style={{ margin: "16px 0 8px" }}>
      <Row>
        {SEGMENTS.map((seg, idx) => {
          const isActive = idx === activeIdx;
          const baseColor = SEGMENT_COLORS[seg];
          return (
            <Column
              key={seg}
              style={{
                backgroundColor: isActive ? baseColor : COLORS.bgCardRaised,
                height: "10px",
                borderRadius: "2px",
                marginRight: idx < SEGMENTS.length - 1 ? "4px" : "0",
                opacity: isActive ? 1 : 0.45,
              }}
            />
          );
        })}
      </Row>
      <Text
        style={{
          fontFamily: FONT_MONO,
          color: COLORS.textTertiary,
          fontSize: "10px",
          letterSpacing: "0.08em",
          margin: "6px 0 0",
        }}
      >
        0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;25&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;50&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;75&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;100
      </Text>
      <Text
        style={{
          fontFamily: FONT_HEADING,
          color: SEGMENT_COLORS[rating],
          fontSize: "32px",
          fontWeight: 600,
          margin: "12px 0 2px",
          textAlign: "center" as const,
        }}
      >
        {percentage}
      </Text>
      <Text
        style={{
          fontFamily: FONT_BODY,
          color: COLORS.textSecondary,
          fontSize: "11px",
          letterSpacing: "0.12em",
          margin: 0,
          textAlign: "center" as const,
        }}
      >
        {RATING_LABELS[rating]}
      </Text>
    </Section>
  );
}

function TickerCard({
  data,
  appUrl,
}: {
  data: EmailTickerData;
  appUrl: string;
}) {
  const positive = data.priceChange >= 0;
  const arrow = positive ? "▲" : "▼";
  const sign = data.priceChangePct >= 0 ? "+" : "";

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
      <Row>
        <Column>
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
            {data.ticker}
            <span
              style={{
                color: COLORS.textTertiary,
                fontWeight: 400,
                marginLeft: "8px",
              }}
            >
              · {data.name}
            </span>
          </Text>
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

      <GaugeBar percentage={data.percentage} rating={data.rating} />

      <Text
        style={{
          fontFamily: FONT_BODY,
          color: COLORS.textTertiary,
          fontSize: "11px",
          textAlign: "center" as const,
          margin: "0 0 16px",
        }}
      >
        {data.triggeredCount} of {data.totalCount} indicators triggered
      </Text>

      <Section style={{ textAlign: "center" as const }}>
        <Button
          href={`${appUrl}/dashboard/${data.ticker}`}
          style={{
            backgroundColor: COLORS.bgCardRaised,
            border: `1px solid ${COLORS.borderStrong}`,
            color: COLORS.accent,
            fontFamily: FONT_BODY,
            fontSize: "12px",
            letterSpacing: "0.06em",
            padding: "10px 18px",
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

export function DailyDigest({
  tickers,
  unsubscribeUrl,
  appUrl,
  dateLabel,
}: DailyDigestProps) {
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
              Should I Buy Now
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
