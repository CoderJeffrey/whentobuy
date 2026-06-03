export type IndicatorId = string;

export type IndicatorCategory = string;

export type Timeframe = "daily" | "weekly" | "monthly";

export const TIMEFRAMES: Timeframe[] = ["daily", "weekly", "monthly"];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  abbreviation: string;
  category: IndicatorCategory;
  description: string;
  supportedTimeframes: Timeframe[];
}

export interface ComboIndicatorRef {
  indicatorId: IndicatorId;
  timeframe: Timeframe;
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

export interface ComboIndicatorStatus {
  indicatorId: IndicatorId;
  label: string;
  abbreviation: string;
  timeframe: Timeframe;
  triggered: boolean;
  displayValue: string;
}

export interface ComboStatus {
  comboId: string;
  name: string;
  green: boolean;
  indicators: ComboIndicatorStatus[];
}

export interface Combo {
  id: string;
  name: string;
  indicators: ComboIndicatorRef[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeframeSeries {
  bars: PriceBar[];
  sma200: SmaPoint[];
}

export interface PriceChart {
  daily: TimeframeSeries;
  weekly: TimeframeSeries;
  monthly: TimeframeSeries;
}

export interface DashboardResponse {
  ticker: string;
  exchange: string;
  symbol: string;
  market: string;
  currency: string;
  name: string;
  asOf: string;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  combos: ComboStatus[];
  anyGreen: boolean;
  priceHistory: PriceBar[];
  sma200Series: SmaPoint[];
  priceChart: PriceChart;
}

export interface Security {
  ticker: string;
  exchange: string;
  market: string;
  name: string;
  cik?: number | null;
}

export interface WatchlistItem {
  symbol: string;
  ticker: string;
  exchange: string;
  market: string;
  currency: string;
  name: string;
  dataReady: boolean;
  currentPrice?: number;
  priceChangePct?: number;
  greenComboCount?: number;
  totalCombos?: number;
}

export interface WatchlistResponse {
  tickers: WatchlistItem[];
}

export type ApiErrorCode =
  | "TICKER_NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "COMBO_LIMIT"
  | "COMBO_NOT_FOUND"
  | "COMBO_ERROR"
  | "INTERNAL";

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  constructor(message: string, code: ApiErrorCode, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
