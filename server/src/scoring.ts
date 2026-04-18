import type { IndicatorRow, Rating, Score, ScoreBreakdownItem } from "./types.js";

const POINTS_RSI = 10;
const POINTS_SMA = 5;
const POINTS_MACD = 2;
const MAX_SCORE = POINTS_RSI + POINTS_SMA + POINTS_MACD;

function ratingForPct(pct: number): Rating {
  if (pct >= 80) return "strong_buy";
  if (pct >= 60) return "weak_buy";
  if (pct >= 40) return "hold";
  if (pct >= 20) return "weak_sell";
  return "immediate_sell";
}

export function scoreDashboard(
  latestClose: number,
  latestIndicators: IndicatorRow,
  recentIndicators: IndicatorRow[],
): Score {
  const rsi = latestIndicators.rsi_14;
  const sma = latestIndicators.sma_200;

  const rsiTriggered = rsi != null && rsi < 30;
  const smaTriggered = sma != null && latestClose > sma;

  const lastThree = recentIndicators.slice(-3);
  const crossInWindow = lastThree.some((r) => r.macd_cross_up === true);

  const breakdown: ScoreBreakdownItem[] = [
    {
      id: "rsi_oversold",
      label: "RSI Oversold",
      tier: "high",
      points: rsiTriggered ? POINTS_RSI : 0,
      triggered: rsiTriggered,
      displayValue:
        rsi != null
          ? rsiTriggered
            ? `RSI: ${rsi.toFixed(1)} (below threshold 30)`
            : `RSI: ${rsi.toFixed(1)} (threshold 30)`
          : "RSI: n/a",
    },
    {
      id: "above_sma_200",
      label: "Above 200 SMA",
      tier: "medium",
      points: smaTriggered ? POINTS_SMA : 0,
      triggered: smaTriggered,
      displayValue:
        sma != null
          ? smaTriggered
            ? `${(((latestClose - sma) / sma) * 100).toFixed(1)}% above SMA-200`
            : `${(((sma - latestClose) / sma) * 100).toFixed(1)}% below SMA-200`
          : "SMA-200: n/a",
    },
    {
      id: "macd_bullish_cross",
      label: "MACD Bullish Cross",
      tier: "low",
      points: crossInWindow ? POINTS_MACD : 0,
      triggered: crossInWindow,
      displayValue: crossInWindow
        ? "Bullish cross in last 3 days"
        : "No cross in last 3 days",
    },
  ];

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  const percentage = Math.round((total / MAX_SCORE) * 100);

  return {
    total,
    max: MAX_SCORE,
    percentage,
    rating: ratingForPct(percentage),
    breakdown,
  };
}
