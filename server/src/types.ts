export type Rating =
  | "strong_buy"
  | "weak_buy"
  | "hold"
  | "weak_sell"
  | "immediate_sell";

export type Tier = "high" | "medium" | "low";

export type IndicatorId = string;

export type IndicatorCategory = string;

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  abbreviation: string;
  category: IndicatorCategory;
  description: string;
}

export interface ScoreBreakdownItem {
  id: IndicatorId;
  label: string;
  abbreviation: string;
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
  triggeredCount: number;
  totalCount: number;
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
  name: string;
  asOf: string;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  score: Score;
  priceHistory: PriceBar[];
  sma200Series: SmaPoint[];
}

export interface PriceRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type UserWeights = Partial<Record<IndicatorId, Tier>>;

export interface UserConfig {
  weights: UserWeights;
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  dataReady: boolean;
  currentPrice?: number;
  priceChangePct?: number;
  rating?: Rating;
  percentage?: number;
}

export interface WatchlistResponse {
  tickers: WatchlistItem[];
}
