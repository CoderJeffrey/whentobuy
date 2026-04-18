export type Rating =
  | "strong_buy"
  | "weak_buy"
  | "hold"
  | "weak_sell"
  | "immediate_sell";

export type Tier = "high" | "medium" | "low";

export interface ScoreBreakdownItem {
  id: "rsi_oversold" | "above_sma_200" | "macd_bullish_cross";
  label: string;
  tier: Tier;
  points: number;
  triggered: boolean;
  displayValue: string;
}

export interface Score {
  total: number;
  max: number;
  percentage: number;
  rating: Rating;
  breakdown: ScoreBreakdownItem[];
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SmaPoint {
  date: string;
  value: number;
}

export interface DashboardResponse {
  ticker: string;
  asOf: string;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  score: Score;
  priceHistory: PriceBar[];
  sma200Series: SmaPoint[];
}
