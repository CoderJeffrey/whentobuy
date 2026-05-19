export type IndicatorId = string;

export type IndicatorCategory = string;

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  abbreviation: string;
  category: IndicatorCategory;
  description: string;
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
  indicatorIds: IndicatorId[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardResponse {
  ticker: string;
  name: string;
  asOf: string;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  combos: ComboStatus[];
  anyGreen: boolean;
  priceHistory: PriceBar[];
  sma200Series: SmaPoint[];
}

export interface Security {
  ticker: string;
  name: string;
  cik?: number | null;
}

export interface WatchlistItem {
  ticker: string;
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
