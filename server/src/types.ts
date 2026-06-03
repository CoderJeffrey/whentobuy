export type IndicatorId = string;

export type IndicatorCategory = string;

/** Bar interval for a price series / indicator instance. */
export type Timeframe = "daily" | "weekly" | "monthly";

export const TIMEFRAMES: Timeframe[] = ["daily", "weekly", "monthly"];

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  abbreviation: string;
  category: IndicatorCategory;
  description: string;
  /** Timeframes this indicator may be evaluated at (market-wide = daily only). */
  supportedTimeframes: Timeframe[];
}

/** One indicator instance inside a combo, pinned to a timeframe. */
export interface ComboIndicatorRef {
  indicatorId: IndicatorId;
  timeframe: Timeframe;
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

/** Price bars + SMA-200 overlay for a single timeframe. */
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
  /** Daily bars — retained for the ticker hero (open/volume/prev close). */
  priceHistory: PriceBar[];
  sma200Series: SmaPoint[];
  /** All three timeframe series for the chart's Daily/Weekly/Monthly toggle. */
  priceChart: PriceChart;
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
