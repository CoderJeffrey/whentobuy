import type {
  IndicatorCategory,
  IndicatorId,
  IndicatorMeta,
  IndicatorRow,
  PriceRow,
} from "./types.js";

export interface IndicatorEvaluation {
  triggered: boolean;
  displayValue: string;
}

export interface IndicatorDef extends IndicatorMeta {
  evaluate: (
    latestPrice: PriceRow,
    latestIndicators: IndicatorRow,
    recentIndicators: IndicatorRow[],
  ) => IndicatorEvaluation;
}

function fmt(n: number | null | undefined, digits = 2): string {
  return n == null ? "n/a" : n.toFixed(digits);
}

export const INDICATOR_REGISTRY: Record<string, IndicatorDef> = {
  rsi_oversold: {
    id: "rsi_oversold",
    label: "RSI Oversold",
    abbreviation: "RSI<30",
    category: "momentum",
    description: "RSI-14 below 30 — classic oversold bounce signal.",
    evaluate: (_p, ind) => {
      const rsi = ind.rsi_14;
      const triggered = rsi != null && rsi < 30;
      return {
        triggered,
        displayValue: rsi == null ? "RSI: n/a" : `RSI: ${fmt(rsi, 1)}`,
      };
    },
  },

  macd_bullish_cross: {
    id: "macd_bullish_cross",
    label: "MACD Bullish Cross",
    abbreviation: "MACD↑",
    category: "momentum",
    description:
      "MACD line crossed above its signal line in the last 3 trading days.",
    evaluate: (_p, _ind, recent) => {
      const lastThree = recent.slice(-3);
      const triggered = lastThree.some((r) => r.macd_cross_up === true);
      return {
        triggered,
        displayValue: triggered
          ? "Bullish cross in last 3 days"
          : "No cross in last 3 days",
      };
    },
  },

  macd_positive: {
    id: "macd_positive",
    label: "MACD Positive",
    abbreviation: "MACD+",
    category: "momentum",
    description: "MACD line above zero — broad-strokes bullish momentum.",
    evaluate: (_p, ind) => {
      const m = ind.macd;
      const triggered = m != null && m > 0;
      return {
        triggered,
        displayValue: m == null ? "MACD: n/a" : `MACD: ${fmt(m, 3)}`,
      };
    },
  },

  above_sma_200: {
    id: "above_sma_200",
    label: "Above 200 SMA",
    abbreviation: ">SMA200",
    category: "trend",
    description: "Close above the 200-day simple moving average.",
    evaluate: (p, ind) => {
      const sma = ind.sma_200;
      if (sma == null) return { triggered: false, displayValue: "SMA-200: n/a" };
      const triggered = p.close > sma;
      const diff = ((p.close - sma) / sma) * 100;
      return {
        triggered,
        displayValue: `${diff >= 0 ? "+" : ""}${fmt(diff, 1)}% vs SMA-200`,
      };
    },
  },

  above_sma_50: {
    id: "above_sma_50",
    label: "Above 50 SMA",
    abbreviation: ">SMA50",
    category: "trend",
    description: "Close above the 50-day simple moving average.",
    evaluate: (p, ind) => {
      const sma = ind.sma_50;
      if (sma == null) return { triggered: false, displayValue: "SMA-50: n/a" };
      const triggered = p.close > sma;
      const diff = ((p.close - sma) / sma) * 100;
      return {
        triggered,
        displayValue: `${diff >= 0 ? "+" : ""}${fmt(diff, 1)}% vs SMA-50`,
      };
    },
  },

  above_sma_20: {
    id: "above_sma_20",
    label: "Above 20 SMA",
    abbreviation: ">SMA20",
    category: "trend",
    description: "Close above the 20-day simple moving average.",
    evaluate: (p, ind) => {
      const sma = ind.sma_20;
      if (sma == null) return { triggered: false, displayValue: "SMA-20: n/a" };
      const triggered = p.close > sma;
      const diff = ((p.close - sma) / sma) * 100;
      return {
        triggered,
        displayValue: `${diff >= 0 ? "+" : ""}${fmt(diff, 1)}% vs SMA-20`,
      };
    },
  },

  golden_cross: {
    id: "golden_cross",
    label: "Golden Cross",
    abbreviation: "GOLD✕",
    category: "trend",
    description:
      "50-day SMA above 200-day SMA — long-term bullish trend regime.",
    evaluate: (_p, ind) => {
      const s50 = ind.sma_50;
      const s200 = ind.sma_200;
      if (s50 == null || s200 == null)
        return { triggered: false, displayValue: "SMA-50 / SMA-200: n/a" };
      const triggered = s50 > s200;
      const gap = ((s50 - s200) / s200) * 100;
      return {
        triggered,
        displayValue: `SMA-50 ${gap >= 0 ? "+" : ""}${fmt(gap, 1)}% vs SMA-200`,
      };
    },
  },

  near_52w_low: {
    id: "near_52w_low",
    label: "Near 52-Week Low",
    abbreviation: "52wLOW",
    category: "mean_reversion",
    description: "Close within 5% of its 52-week low.",
    evaluate: (_p, ind) => {
      const pct = ind.pct_from_52w_low;
      if (pct == null)
        return { triggered: false, displayValue: "52w low: n/a" };
      const triggered = pct <= 5;
      return {
        triggered,
        displayValue: `${fmt(pct, 1)}% above 52w low`,
      };
    },
  },

  bb_lower_touch: {
    id: "bb_lower_touch",
    label: "Lower Bollinger Band Touch",
    abbreviation: "BB↓",
    category: "mean_reversion",
    description:
      "Close at or below the lower Bollinger Band (20-period, 2σ).",
    evaluate: (p, ind) => {
      const lower = ind.bb_lower;
      if (lower == null)
        return { triggered: false, displayValue: "BB lower: n/a" };
      const triggered = p.close <= lower;
      const diff = ((p.close - lower) / lower) * 100;
      return {
        triggered,
        displayValue: `${diff >= 0 ? "+" : ""}${fmt(diff, 1)}% vs BB lower`,
      };
    },
  },

  volume_spike: {
    id: "volume_spike",
    label: "Volume Spike",
    abbreviation: "VOL↑",
    category: "volume",
    description: "Today's volume is more than 1.5× the 20-day average.",
    evaluate: (p, ind) => {
      const avg = ind.volume_avg_20;
      if (avg == null || avg <= 0)
        return { triggered: false, displayValue: "Volume avg: n/a" };
      const ratio = p.volume / avg;
      const triggered = ratio > 1.5;
      return {
        triggered,
        displayValue: `${fmt(ratio, 2)}× 20-day avg volume`,
      };
    },
  },
};

export const INDICATOR_METADATA: IndicatorMeta[] = Object.values(
  INDICATOR_REGISTRY,
)
  .map(({ id, label, abbreviation, category, description }) => ({
    id,
    label,
    abbreviation,
    category,
    description,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const INDICATOR_IDS: IndicatorId[] = Object.keys(INDICATOR_REGISTRY);

export function isIndicatorId(value: unknown): value is IndicatorId {
  return typeof value === "string" && value in INDICATOR_REGISTRY;
}

export const CATEGORIES: IndicatorCategory[] = [
  "momentum",
  "trend",
  "mean_reversion",
  "volume",
];
