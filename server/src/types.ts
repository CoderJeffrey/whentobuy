export type IndicatorId = string;

export type IndicatorCategory = string;

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  abbreviation: string;
  category: IndicatorCategory;
  description: string;
}

export interface MarketData {
  date: string;
  vix: number | null;
  fngValue: number | null;
  fngRating: string | null;
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
}

export interface PriceRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistItem {
  /** Qualified symbol used for routing/removal, e.g. "600519.SS". */
  symbol: string;
  /** Bare display ticker, e.g. "600519". */
  ticker: string;
  exchange: string;
  market: string;
  currency: string;
  name: string;
  dataReady: boolean;
  currentPrice?: number;
  priceChangePct?: number;
  /** Number of combos currently green for this ticker (binary status driver). */
  greenComboCount?: number;
  /** Total combos the user has — used to render "N / total" when desired. */
  totalCombos?: number;
}

export interface WatchlistResponse {
  tickers: WatchlistItem[];
}
