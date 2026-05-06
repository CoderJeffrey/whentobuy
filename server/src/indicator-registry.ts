import type { EvalContext } from "./eval-context.js";
import type {
  IndicatorCategory,
  IndicatorId,
  IndicatorMeta,
} from "./types.js";

export interface IndicatorEvaluation {
  triggered: boolean;
  displayValue: string;
}

export interface IndicatorDef extends IndicatorMeta {
  evaluate: (ctx: EvalContext) => IndicatorEvaluation;
}

function fmt(n: number | null | undefined, digits = 2): string {
  return n == null ? "n/a" : n.toFixed(digits);
}

function pctVs(close: number, ref: number | null | undefined): string {
  if (ref == null) return "n/a";
  const diff = ((close - ref) / ref) * 100;
  return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
}

function latest<T>(series: (T | null)[], i: number): T | null {
  return series[i] ?? null;
}

function recentTrue(
  series: (boolean | null)[],
  i: number,
  lookback = 3,
): { fired: boolean; daysAgo: number | null } {
  for (let back = 0; back < lookback; back++) {
    const v = series[i - back];
    if (v === true) return { fired: true, daysAgo: back };
  }
  return { fired: false, daysAgo: null };
}

function patternResult(
  ctx: EvalContext,
  patternKey: string,
): IndicatorEvaluation {
  const hit = ctx.patterns[patternKey] ?? { fired: false, daysAgo: null };
  return {
    triggered: hit.fired,
    displayValue:
      hit.daysAgo == null
        ? "No recent fire"
        : hit.daysAgo === 0
          ? "Fired today"
          : `Fired ${hit.daysAgo}d ago`,
  };
}

const REGISTRY: IndicatorDef[] = [
  // ──────────────── Momentum ────────────────
  {
    id: "rsi_oversold",
    label: "RSI Oversold",
    abbreviation: "RSI<30",
    category: "momentum",
    description: "RSI-14 below 30 — classic oversold bounce signal.",
    evaluate: (ctx) => {
      const v = latest(ctx.rsi14, ctx.i);
      return {
        triggered: v != null && v < 30,
        displayValue: `RSI: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "rsi_overbought",
    label: "RSI Overbought",
    abbreviation: "RSI>70",
    category: "momentum",
    description: "RSI-14 above 70 — overbought, fade-the-rip signal.",
    evaluate: (ctx) => {
      const v = latest(ctx.rsi14, ctx.i);
      return {
        triggered: v != null && v > 70,
        displayValue: `RSI: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "stoch_oversold",
    label: "Stochastic Oversold",
    abbreviation: "%K<20",
    category: "momentum",
    description: "Stochastic %K (14,3) below 20.",
    evaluate: (ctx) => {
      const v = latest(ctx.stochK, ctx.i);
      return {
        triggered: v != null && v < 20,
        displayValue: `%K: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "stoch_overbought",
    label: "Stochastic Overbought",
    abbreviation: "%K>80",
    category: "momentum",
    description: "Stochastic %K (14,3) above 80.",
    evaluate: (ctx) => {
      const v = latest(ctx.stochK, ctx.i);
      return {
        triggered: v != null && v > 80,
        displayValue: `%K: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "williams_oversold",
    label: "Williams %R Oversold",
    abbreviation: "%R<-80",
    category: "momentum",
    description: "Williams %R (14) below -80.",
    evaluate: (ctx) => {
      const v = latest(ctx.williamsR14, ctx.i);
      return {
        triggered: v != null && v < -80,
        displayValue: `%R: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "williams_overbought",
    label: "Williams %R Overbought",
    abbreviation: "%R>-20",
    category: "momentum",
    description: "Williams %R (14) above -20.",
    evaluate: (ctx) => {
      const v = latest(ctx.williamsR14, ctx.i);
      return {
        triggered: v != null && v > -20,
        displayValue: `%R: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "cci_oversold",
    label: "CCI Oversold",
    abbreviation: "CCI<-100",
    category: "momentum",
    description: "Commodity Channel Index (20) below -100.",
    evaluate: (ctx) => {
      const v = latest(ctx.cci20, ctx.i);
      return {
        triggered: v != null && v < -100,
        displayValue: `CCI: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "cci_overbought",
    label: "CCI Overbought",
    abbreviation: "CCI>100",
    category: "momentum",
    description: "Commodity Channel Index (20) above +100.",
    evaluate: (ctx) => {
      const v = latest(ctx.cci20, ctx.i);
      return {
        triggered: v != null && v > 100,
        displayValue: `CCI: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "mfi_oversold",
    label: "MFI Oversold",
    abbreviation: "MFI<20",
    category: "momentum",
    description: "Money Flow Index (14) below 20.",
    evaluate: (ctx) => {
      const v = latest(ctx.mfi14, ctx.i);
      return {
        triggered: v != null && v < 20,
        displayValue: `MFI: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "mfi_overbought",
    label: "MFI Overbought",
    abbreviation: "MFI>80",
    category: "momentum",
    description: "Money Flow Index (14) above 80.",
    evaluate: (ctx) => {
      const v = latest(ctx.mfi14, ctx.i);
      return {
        triggered: v != null && v > 80,
        displayValue: `MFI: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "roc_positive",
    label: "Rate of Change Positive",
    abbreviation: "ROC>0",
    category: "momentum",
    description: "12-period rate of change above zero.",
    evaluate: (ctx) => {
      const v = latest(ctx.roc12, ctx.i);
      return {
        triggered: v != null && v > 0,
        displayValue: `ROC: ${fmt(v, 2)}%`,
      };
    },
  },
  {
    id: "roc_negative",
    label: "Rate of Change Negative",
    abbreviation: "ROC<0",
    category: "momentum",
    description: "12-period rate of change below zero.",
    evaluate: (ctx) => {
      const v = latest(ctx.roc12, ctx.i);
      return {
        triggered: v != null && v < 0,
        displayValue: `ROC: ${fmt(v, 2)}%`,
      };
    },
  },
  {
    id: "momentum_positive",
    label: "Momentum Positive",
    abbreviation: "MOM>0",
    category: "momentum",
    description: "10-period price momentum positive.",
    evaluate: (ctx) => {
      const v = latest(ctx.momentum10, ctx.i);
      return {
        triggered: v != null && v > 0,
        displayValue: `MOM: ${fmt(v, 2)}`,
      };
    },
  },
  {
    id: "momentum_negative",
    label: "Momentum Negative",
    abbreviation: "MOM<0",
    category: "momentum",
    description: "10-period price momentum negative.",
    evaluate: (ctx) => {
      const v = latest(ctx.momentum10, ctx.i);
      return {
        triggered: v != null && v < 0,
        displayValue: `MOM: ${fmt(v, 2)}`,
      };
    },
  },
  {
    id: "trix_bullish_cross",
    label: "TRIX Bullish Cross",
    abbreviation: "TRIX↑0",
    category: "momentum",
    description: "TRIX (15) crossed above zero in the last 3 days.",
    evaluate: (ctx) => {
      const hit = recentTrue(ctx.trixCrossUp, ctx.i, 3);
      return {
        triggered: hit.fired,
        displayValue: hit.fired
          ? `Cross ${hit.daysAgo === 0 ? "today" : `${hit.daysAgo}d ago`}`
          : `TRIX: ${fmt(latest(ctx.trix15, ctx.i), 4)}`,
      };
    },
  },
  {
    id: "trix_bearish_cross",
    label: "TRIX Bearish Cross",
    abbreviation: "TRIX↓0",
    category: "momentum",
    description: "TRIX (15) crossed below zero in the last 3 days.",
    evaluate: (ctx) => {
      const hit = recentTrue(ctx.trixCrossDown, ctx.i, 3);
      return {
        triggered: hit.fired,
        displayValue: hit.fired
          ? `Cross ${hit.daysAgo === 0 ? "today" : `${hit.daysAgo}d ago`}`
          : `TRIX: ${fmt(latest(ctx.trix15, ctx.i), 4)}`,
      };
    },
  },
  {
    id: "kst_bullish_cross",
    label: "KST Bullish Cross",
    abbreviation: "KST↑",
    category: "momentum",
    description: "KST line crossed above its signal line in the last 3 days.",
    evaluate: (ctx) => {
      const hit = recentTrue(ctx.kstCrossUp, ctx.i, 3);
      return {
        triggered: hit.fired,
        displayValue: hit.fired
          ? `Cross ${hit.daysAgo === 0 ? "today" : `${hit.daysAgo}d ago`}`
          : "No recent cross",
      };
    },
  },
  {
    id: "kst_bearish_cross",
    label: "KST Bearish Cross",
    abbreviation: "KST↓",
    category: "momentum",
    description: "KST line crossed below its signal line in the last 3 days.",
    evaluate: (ctx) => {
      const hit = recentTrue(ctx.kstCrossDown, ctx.i, 3);
      return {
        triggered: hit.fired,
        displayValue: hit.fired
          ? `Cross ${hit.daysAgo === 0 ? "today" : `${hit.daysAgo}d ago`}`
          : "No recent cross",
      };
    },
  },
  {
    id: "ult_oscillator_oversold",
    label: "Ultimate Oscillator Oversold",
    abbreviation: "UO<30",
    category: "momentum",
    description: "Ultimate Oscillator (7,14,28) below 30.",
    evaluate: (ctx) => {
      const v = latest(ctx.ultOsc, ctx.i);
      return {
        triggered: v != null && v < 30,
        displayValue: `UO: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "ult_oscillator_overbought",
    label: "Ultimate Oscillator Overbought",
    abbreviation: "UO>70",
    category: "momentum",
    description: "Ultimate Oscillator (7,14,28) above 70.",
    evaluate: (ctx) => {
      const v = latest(ctx.ultOsc, ctx.i);
      return {
        triggered: v != null && v > 70,
        displayValue: `UO: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "ao_above_zero",
    label: "Awesome Oscillator Above Zero",
    abbreviation: "AO>0",
    category: "momentum",
    description: "Awesome Oscillator (5,34) above zero — bullish momentum.",
    evaluate: (ctx) => {
      const v = latest(ctx.ao, ctx.i);
      return {
        triggered: v != null && v > 0,
        displayValue: `AO: ${fmt(v, 3)}`,
      };
    },
  },
  {
    id: "ao_below_zero",
    label: "Awesome Oscillator Below Zero",
    abbreviation: "AO<0",
    category: "momentum",
    description: "Awesome Oscillator (5,34) below zero — bearish momentum.",
    evaluate: (ctx) => {
      const v = latest(ctx.ao, ctx.i);
      return {
        triggered: v != null && v < 0,
        displayValue: `AO: ${fmt(v, 3)}`,
      };
    },
  },
  {
    id: "macd_bullish_cross",
    label: "MACD Bullish Cross",
    abbreviation: "MACD↑",
    category: "momentum",
    description: "MACD line crossed above its signal line in the last 3 days.",
    evaluate: (ctx) => {
      const hit = recentTrue(ctx.macdCrossUp, ctx.i, 3);
      return {
        triggered: hit.fired,
        displayValue: hit.fired
          ? `Cross ${hit.daysAgo === 0 ? "today" : `${hit.daysAgo}d ago`}`
          : "No cross in last 3 days",
      };
    },
  },
  {
    id: "macd_bearish_cross",
    label: "MACD Bearish Cross",
    abbreviation: "MACD↓",
    category: "momentum",
    description: "MACD line crossed below its signal line in the last 3 days.",
    evaluate: (ctx) => {
      const hit = recentTrue(ctx.macdCrossDown, ctx.i, 3);
      return {
        triggered: hit.fired,
        displayValue: hit.fired
          ? `Cross ${hit.daysAgo === 0 ? "today" : `${hit.daysAgo}d ago`}`
          : "No cross in last 3 days",
      };
    },
  },
  {
    id: "macd_positive",
    label: "MACD Positive",
    abbreviation: "MACD+",
    category: "momentum",
    description: "MACD line above zero — broad-strokes bullish momentum.",
    evaluate: (ctx) => {
      const v = latest(ctx.macd, ctx.i);
      return {
        triggered: v != null && v > 0,
        displayValue: `MACD: ${fmt(v, 3)}`,
      };
    },
  },

  // ──────────────── Trend ────────────────
  {
    id: "above_sma_20",
    label: "Above 20 SMA",
    abbreviation: ">SMA20",
    category: "trend",
    description: "Close above the 20-day simple moving average.",
    evaluate: (ctx) => {
      const sma = latest(ctx.sma20, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: sma != null && close > sma,
        displayValue: `${pctVs(close, sma)} vs SMA-20`,
      };
    },
  },
  {
    id: "above_sma_50",
    label: "Above 50 SMA",
    abbreviation: ">SMA50",
    category: "trend",
    description: "Close above the 50-day simple moving average.",
    evaluate: (ctx) => {
      const sma = latest(ctx.sma50, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: sma != null && close > sma,
        displayValue: `${pctVs(close, sma)} vs SMA-50`,
      };
    },
  },
  {
    id: "above_sma_200",
    label: "Above 200 SMA",
    abbreviation: ">SMA200",
    category: "trend",
    description: "Close above the 200-day simple moving average.",
    evaluate: (ctx) => {
      const sma = latest(ctx.sma200, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: sma != null && close > sma,
        displayValue: `${pctVs(close, sma)} vs SMA-200`,
      };
    },
  },
  {
    id: "above_ema_20",
    label: "Above 20 EMA",
    abbreviation: ">EMA20",
    category: "trend",
    description: "Close above the 20-day exponential moving average.",
    evaluate: (ctx) => {
      const ema = latest(ctx.ema20, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: ema != null && close > ema,
        displayValue: `${pctVs(close, ema)} vs EMA-20`,
      };
    },
  },
  {
    id: "above_ema_50",
    label: "Above 50 EMA",
    abbreviation: ">EMA50",
    category: "trend",
    description: "Close above the 50-day exponential moving average.",
    evaluate: (ctx) => {
      const ema = latest(ctx.ema50, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: ema != null && close > ema,
        displayValue: `${pctVs(close, ema)} vs EMA-50`,
      };
    },
  },
  {
    id: "above_ema_200",
    label: "Above 200 EMA",
    abbreviation: ">EMA200",
    category: "trend",
    description: "Close above the 200-day exponential moving average.",
    evaluate: (ctx) => {
      const ema = latest(ctx.ema200, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: ema != null && close > ema,
        displayValue: `${pctVs(close, ema)} vs EMA-200`,
      };
    },
  },
  {
    id: "above_wma_20",
    label: "Above 20 WMA",
    abbreviation: ">WMA20",
    category: "trend",
    description: "Close above the 20-day weighted moving average.",
    evaluate: (ctx) => {
      const wma = latest(ctx.wma20, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: wma != null && close > wma,
        displayValue: `${pctVs(close, wma)} vs WMA-20`,
      };
    },
  },
  {
    id: "above_wma_50",
    label: "Above 50 WMA",
    abbreviation: ">WMA50",
    category: "trend",
    description: "Close above the 50-day weighted moving average.",
    evaluate: (ctx) => {
      const wma = latest(ctx.wma50, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: wma != null && close > wma,
        displayValue: `${pctVs(close, wma)} vs WMA-50`,
      };
    },
  },
  {
    id: "above_dema_20",
    label: "Above 20 DEMA",
    abbreviation: ">DEMA20",
    category: "trend",
    description: "Close above the 20-day double exponential moving average.",
    evaluate: (ctx) => {
      const v = latest(ctx.dema20, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close > v,
        displayValue: `${pctVs(close, v)} vs DEMA-20`,
      };
    },
  },
  {
    id: "above_tema_20",
    label: "Above 20 TEMA",
    abbreviation: ">TEMA20",
    category: "trend",
    description: "Close above the 20-day triple exponential moving average.",
    evaluate: (ctx) => {
      const v = latest(ctx.tema20, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close > v,
        displayValue: `${pctVs(close, v)} vs TEMA-20`,
      };
    },
  },
  {
    id: "golden_cross",
    label: "Golden Cross",
    abbreviation: "GOLD✕",
    category: "trend",
    description: "50-day SMA above 200-day SMA — long-term bullish regime.",
    evaluate: (ctx) => {
      const s50 = latest(ctx.sma50, ctx.i);
      const s200 = latest(ctx.sma200, ctx.i);
      if (s50 == null || s200 == null) {
        return { triggered: false, displayValue: "SMA-50 / SMA-200: n/a" };
      }
      return {
        triggered: s50 > s200,
        displayValue: `SMA-50 ${pctVs(s50, s200)} vs SMA-200`,
      };
    },
  },
  {
    id: "death_cross",
    label: "Death Cross",
    abbreviation: "DEATH✕",
    category: "trend",
    description: "50-day SMA below 200-day SMA — long-term bearish regime.",
    evaluate: (ctx) => {
      const s50 = latest(ctx.sma50, ctx.i);
      const s200 = latest(ctx.sma200, ctx.i);
      if (s50 == null || s200 == null) {
        return { triggered: false, displayValue: "SMA-50 / SMA-200: n/a" };
      }
      return {
        triggered: s50 < s200,
        displayValue: `SMA-50 ${pctVs(s50, s200)} vs SMA-200`,
      };
    },
  },
  {
    id: "ema_golden_cross",
    label: "EMA Golden Cross",
    abbreviation: "EMA50>200",
    category: "trend",
    description: "50-day EMA above 200-day EMA.",
    evaluate: (ctx) => {
      const a = latest(ctx.ema50, ctx.i);
      const b = latest(ctx.ema200, ctx.i);
      if (a == null || b == null) {
        return { triggered: false, displayValue: "EMA-50 / EMA-200: n/a" };
      }
      return {
        triggered: a > b,
        displayValue: `EMA-50 ${pctVs(a, b)} vs EMA-200`,
      };
    },
  },
  {
    id: "ema_death_cross",
    label: "EMA Death Cross",
    abbreviation: "EMA50<200",
    category: "trend",
    description: "50-day EMA below 200-day EMA.",
    evaluate: (ctx) => {
      const a = latest(ctx.ema50, ctx.i);
      const b = latest(ctx.ema200, ctx.i);
      if (a == null || b == null) {
        return { triggered: false, displayValue: "EMA-50 / EMA-200: n/a" };
      }
      return {
        triggered: a < b,
        displayValue: `EMA-50 ${pctVs(a, b)} vs EMA-200`,
      };
    },
  },
  {
    id: "ema_short_above_mid",
    label: "EMA-20 Above EMA-50",
    abbreviation: "EMA20>50",
    category: "trend",
    description: "20-day EMA above 50-day EMA — short-term uptrend.",
    evaluate: (ctx) => {
      const a = latest(ctx.ema20, ctx.i);
      const b = latest(ctx.ema50, ctx.i);
      if (a == null || b == null) {
        return { triggered: false, displayValue: "EMA-20 / EMA-50: n/a" };
      }
      return {
        triggered: a > b,
        displayValue: `EMA-20 ${pctVs(a, b)} vs EMA-50`,
      };
    },
  },
  {
    id: "ema_short_below_mid",
    label: "EMA-20 Below EMA-50",
    abbreviation: "EMA20<50",
    category: "trend",
    description: "20-day EMA below 50-day EMA — short-term downtrend.",
    evaluate: (ctx) => {
      const a = latest(ctx.ema20, ctx.i);
      const b = latest(ctx.ema50, ctx.i);
      if (a == null || b == null) {
        return { triggered: false, displayValue: "EMA-20 / EMA-50: n/a" };
      }
      return {
        triggered: a < b,
        displayValue: `EMA-20 ${pctVs(a, b)} vs EMA-50`,
      };
    },
  },
  {
    id: "adx_strong_trend",
    label: "ADX Strong Trend",
    abbreviation: "ADX>25",
    category: "trend",
    description: "ADX-14 above 25 — directional movement is strong.",
    evaluate: (ctx) => {
      const v = latest(ctx.adx14, ctx.i);
      return {
        triggered: v != null && v > 25,
        displayValue: `ADX: ${fmt(v, 1)}`,
      };
    },
  },
  {
    id: "aroon_up_dominant",
    label: "Aroon Up Dominant",
    abbreviation: "AROON↑",
    category: "trend",
    description: "Aroon Up above 70 and above Aroon Down — fresh uptrend.",
    evaluate: (ctx) => {
      const up = latest(ctx.aroonUp25, ctx.i);
      const down = latest(ctx.aroonDown25, ctx.i);
      return {
        triggered: up != null && down != null && up > 70 && up > down,
        displayValue: `Up ${fmt(up, 0)} / Down ${fmt(down, 0)}`,
      };
    },
  },
  {
    id: "aroon_down_dominant",
    label: "Aroon Down Dominant",
    abbreviation: "AROON↓",
    category: "trend",
    description: "Aroon Down above 70 and above Aroon Up — fresh downtrend.",
    evaluate: (ctx) => {
      const up = latest(ctx.aroonUp25, ctx.i);
      const down = latest(ctx.aroonDown25, ctx.i);
      return {
        triggered: up != null && down != null && down > 70 && down > up,
        displayValue: `Up ${fmt(up, 0)} / Down ${fmt(down, 0)}`,
      };
    },
  },
  {
    id: "psar_bullish",
    label: "PSAR Bullish",
    abbreviation: "PSAR<P",
    category: "trend",
    description: "Parabolic SAR below price — bullish stop-and-reverse state.",
    evaluate: (ctx) => {
      const v = latest(ctx.psar, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close > v,
        displayValue: `PSAR: ${fmt(v, 2)}`,
      };
    },
  },
  {
    id: "psar_bearish",
    label: "PSAR Bearish",
    abbreviation: "PSAR>P",
    category: "trend",
    description: "Parabolic SAR above price — bearish stop-and-reverse state.",
    evaluate: (ctx) => {
      const v = latest(ctx.psar, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close < v,
        displayValue: `PSAR: ${fmt(v, 2)}`,
      };
    },
  },

  // ──────────────── Volatility ────────────────
  {
    id: "bb_lower_touch",
    label: "Lower Bollinger Band Touch",
    abbreviation: "BB↓",
    category: "volatility",
    description: "Close at or below the lower Bollinger Band (20, 2σ).",
    evaluate: (ctx) => {
      const v = latest(ctx.bbLower, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close <= v,
        displayValue: `${pctVs(close, v)} vs BB lower`,
      };
    },
  },
  {
    id: "bb_upper_touch",
    label: "Upper Bollinger Band Touch",
    abbreviation: "BB↑",
    category: "volatility",
    description: "Close at or above the upper Bollinger Band (20, 2σ).",
    evaluate: (ctx) => {
      const v = latest(ctx.bbUpper, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close >= v,
        displayValue: `${pctVs(close, v)} vs BB upper`,
      };
    },
  },
  {
    id: "bb_squeeze",
    label: "Bollinger Band Squeeze",
    abbreviation: "BB SQZ",
    category: "volatility",
    description: "Band width below 50% of its 100-day average — coiled spring.",
    evaluate: (ctx) => {
      const w = latest(ctx.bbWidth, ctx.i);
      const avg = latest(ctx.bbWidthAvg100, ctx.i);
      return {
        triggered: w != null && avg != null && avg > 0 && w < avg * 0.5,
        displayValue:
          w == null || avg == null || avg === 0
            ? "BB width: n/a"
            : `${((w / avg) * 100).toFixed(0)}% of 100d avg`,
      };
    },
  },
  {
    id: "bb_expansion",
    label: "Bollinger Band Expansion",
    abbreviation: "BB EXP",
    category: "volatility",
    description: "Band width above 150% of its 100-day average.",
    evaluate: (ctx) => {
      const w = latest(ctx.bbWidth, ctx.i);
      const avg = latest(ctx.bbWidthAvg100, ctx.i);
      return {
        triggered: w != null && avg != null && avg > 0 && w > avg * 1.5,
        displayValue:
          w == null || avg == null || avg === 0
            ? "BB width: n/a"
            : `${((w / avg) * 100).toFixed(0)}% of 100d avg`,
      };
    },
  },
  {
    id: "kc_breakout_up",
    label: "Keltner Breakout Up",
    abbreviation: "KC↑",
    category: "volatility",
    description: "Close above the upper Keltner Channel.",
    evaluate: (ctx) => {
      const v = latest(ctx.kcUpper, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close > v,
        displayValue: `${pctVs(close, v)} vs KC upper`,
      };
    },
  },
  {
    id: "kc_breakout_down",
    label: "Keltner Breakout Down",
    abbreviation: "KC↓",
    category: "volatility",
    description: "Close below the lower Keltner Channel.",
    evaluate: (ctx) => {
      const v = latest(ctx.kcLower, ctx.i);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close < v,
        displayValue: `${pctVs(close, v)} vs KC lower`,
      };
    },
  },
  {
    id: "atr_expansion",
    label: "ATR Expansion",
    abbreviation: "ATR↑",
    category: "volatility",
    description: "ATR-14 above 150% of its 100-day average.",
    evaluate: (ctx) => {
      const a = latest(ctx.atr14, ctx.i);
      const avg = latest(ctx.atrAvg100, ctx.i);
      return {
        triggered: a != null && avg != null && avg > 0 && a > avg * 1.5,
        displayValue:
          a == null || avg == null || avg === 0
            ? "ATR: n/a"
            : `${((a / avg) * 100).toFixed(0)}% of 100d avg`,
      };
    },
  },
  {
    id: "atr_contraction",
    label: "ATR Contraction",
    abbreviation: "ATR↓",
    category: "volatility",
    description: "ATR-14 below 50% of its 100-day average.",
    evaluate: (ctx) => {
      const a = latest(ctx.atr14, ctx.i);
      const avg = latest(ctx.atrAvg100, ctx.i);
      return {
        triggered: a != null && avg != null && avg > 0 && a < avg * 0.5,
        displayValue:
          a == null || avg == null || avg === 0
            ? "ATR: n/a"
            : `${((a / avg) * 100).toFixed(0)}% of 100d avg`,
      };
    },
  },
  {
    id: "donchian_breakout_up",
    label: "Donchian Breakout Up",
    abbreviation: "DON↑",
    category: "volatility",
    description: "Close above the prior 20-day high.",
    evaluate: (ctx) => {
      // Compare against yesterday's Donchian upper to detect a fresh breakout.
      const v = latest(ctx.donchUpper20, ctx.i - 1);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close > v,
        displayValue: `${pctVs(close, v)} vs prior 20d high`,
      };
    },
  },
  {
    id: "donchian_breakout_down",
    label: "Donchian Breakout Down",
    abbreviation: "DON↓",
    category: "volatility",
    description: "Close below the prior 20-day low.",
    evaluate: (ctx) => {
      const v = latest(ctx.donchLower20, ctx.i - 1);
      const close = ctx.closes[ctx.i]!;
      return {
        triggered: v != null && close < v,
        displayValue: `${pctVs(close, v)} vs prior 20d low`,
      };
    },
  },

  // ──────────────── Volume ────────────────
  {
    id: "volume_spike",
    label: "Volume Spike (1.5×)",
    abbreviation: "VOL>1.5×",
    category: "volume",
    description: "Today's volume more than 1.5× the 20-day average.",
    evaluate: (ctx) => {
      const avg = latest(ctx.volumeAvg20, ctx.i);
      const v = ctx.volumes[ctx.i]!;
      const ratio = avg && avg > 0 ? v / avg : null;
      return {
        triggered: ratio != null && ratio > 1.5,
        displayValue:
          ratio == null ? "Volume avg: n/a" : `${ratio.toFixed(2)}× 20d avg`,
      };
    },
  },
  {
    id: "volume_spike_2x",
    label: "Volume Spike (2×)",
    abbreviation: "VOL>2×",
    category: "volume",
    description: "Today's volume more than 2× the 20-day average.",
    evaluate: (ctx) => {
      const avg = latest(ctx.volumeAvg20, ctx.i);
      const v = ctx.volumes[ctx.i]!;
      const ratio = avg && avg > 0 ? v / avg : null;
      return {
        triggered: ratio != null && ratio > 2,
        displayValue:
          ratio == null ? "Volume avg: n/a" : `${ratio.toFixed(2)}× 20d avg`,
      };
    },
  },
  {
    id: "volume_spike_3x",
    label: "Volume Spike (3×)",
    abbreviation: "VOL>3×",
    category: "volume",
    description: "Today's volume more than 3× the 20-day average.",
    evaluate: (ctx) => {
      const avg = latest(ctx.volumeAvg20, ctx.i);
      const v = ctx.volumes[ctx.i]!;
      const ratio = avg && avg > 0 ? v / avg : null;
      return {
        triggered: ratio != null && ratio > 3,
        displayValue:
          ratio == null ? "Volume avg: n/a" : `${ratio.toFixed(2)}× 20d avg`,
      };
    },
  },
  {
    id: "obv_rising",
    label: "OBV Rising",
    abbreviation: "OBV↑",
    category: "volume",
    description: "On-Balance Volume up over the last 5 bars.",
    evaluate: (ctx) => {
      const s = latest(ctx.obvSlope5, ctx.i);
      return {
        triggered: s != null && s > 0,
        displayValue: s == null ? "OBV slope: n/a" : `Δ5: ${fmt(s, 0)}`,
      };
    },
  },
  {
    id: "obv_falling",
    label: "OBV Falling",
    abbreviation: "OBV↓",
    category: "volume",
    description: "On-Balance Volume down over the last 5 bars.",
    evaluate: (ctx) => {
      const s = latest(ctx.obvSlope5, ctx.i);
      return {
        triggered: s != null && s < 0,
        displayValue: s == null ? "OBV slope: n/a" : `Δ5: ${fmt(s, 0)}`,
      };
    },
  },
  {
    id: "vpt_bullish",
    label: "VPT Bullish",
    abbreviation: "VPT↑",
    category: "volume",
    description: "Volume Price Trend rising over the last 5 bars.",
    evaluate: (ctx) => {
      const s = latest(ctx.vptSlope5, ctx.i);
      return {
        triggered: s != null && s > 0,
        displayValue: s == null ? "VPT slope: n/a" : `Δ5: ${fmt(s, 2)}`,
      };
    },
  },
  {
    id: "ad_rising",
    label: "A/D Line Rising",
    abbreviation: "A/D↑",
    category: "volume",
    description: "Accumulation/Distribution Line rising over the last 5 bars.",
    evaluate: (ctx) => {
      const s = latest(ctx.adSlope5, ctx.i);
      return {
        triggered: s != null && s > 0,
        displayValue: s == null ? "A/D slope: n/a" : `Δ5: ${fmt(s, 0)}`,
      };
    },
  },
  {
    id: "cmf_positive",
    label: "Chaikin Money Flow Positive",
    abbreviation: "CMF>0",
    category: "volume",
    description: "Chaikin Money Flow (20) above zero — buying pressure.",
    evaluate: (ctx) => {
      const v = latest(ctx.cmf20, ctx.i);
      return {
        triggered: v != null && v > 0,
        displayValue: `CMF: ${fmt(v, 3)}`,
      };
    },
  },
  {
    id: "cmf_negative",
    label: "Chaikin Money Flow Negative",
    abbreviation: "CMF<0",
    category: "volume",
    description: "Chaikin Money Flow (20) below zero — selling pressure.",
    evaluate: (ctx) => {
      const v = latest(ctx.cmf20, ctx.i);
      return {
        triggered: v != null && v < 0,
        displayValue: `CMF: ${fmt(v, 3)}`,
      };
    },
  },
  {
    id: "force_index_positive",
    label: "Force Index Positive",
    abbreviation: "FI>0",
    category: "volume",
    description: "Force Index (13) above zero — buying force.",
    evaluate: (ctx) => {
      const v = latest(ctx.forceIndex13, ctx.i);
      return {
        triggered: v != null && v > 0,
        displayValue: `FI: ${fmt(v, 0)}`,
      };
    },
  },

  // ──────────────── Patterns ────────────────
  {
    id: "pattern_hammer",
    label: "Hammer",
    abbreviation: "HAMMER",
    category: "pattern",
    description: "Hammer candlestick — potential bullish reversal.",
    evaluate: (ctx) => patternResult(ctx, "hammer"),
  },
  {
    id: "pattern_shooting_star",
    label: "Shooting Star",
    abbreviation: "SHOOT",
    category: "pattern",
    description: "Shooting star — potential bearish reversal.",
    evaluate: (ctx) => patternResult(ctx, "shooting_star"),
  },
  {
    id: "pattern_bullish_engulfing",
    label: "Bullish Engulfing",
    abbreviation: "BENG",
    category: "pattern",
    description: "Bullish engulfing — strong reversal up signal.",
    evaluate: (ctx) => patternResult(ctx, "bullish_engulfing"),
  },
  {
    id: "pattern_bearish_engulfing",
    label: "Bearish Engulfing",
    abbreviation: "BRENG",
    category: "pattern",
    description: "Bearish engulfing — strong reversal down signal.",
    evaluate: (ctx) => patternResult(ctx, "bearish_engulfing"),
  },
  {
    id: "pattern_morning_star",
    label: "Morning Star",
    abbreviation: "MORN★",
    category: "pattern",
    description: "Three-bar bullish reversal pattern.",
    evaluate: (ctx) => patternResult(ctx, "morning_star"),
  },
  {
    id: "pattern_evening_star",
    label: "Evening Star",
    abbreviation: "EVE★",
    category: "pattern",
    description: "Three-bar bearish reversal pattern.",
    evaluate: (ctx) => patternResult(ctx, "evening_star"),
  },
  {
    id: "pattern_doji",
    label: "Doji",
    abbreviation: "DOJI",
    category: "pattern",
    description: "Doji — indecision and possible reversal.",
    evaluate: (ctx) => patternResult(ctx, "doji"),
  },
  {
    id: "pattern_three_white_soldiers",
    label: "Three White Soldiers",
    abbreviation: "3WS",
    category: "pattern",
    description: "Three consecutive long bullish candles — strong continuation.",
    evaluate: (ctx) => patternResult(ctx, "three_white_soldiers"),
  },
  {
    id: "pattern_three_black_crows",
    label: "Three Black Crows",
    abbreviation: "3BC",
    category: "pattern",
    description: "Three consecutive long bearish candles — strong continuation.",
    evaluate: (ctx) => patternResult(ctx, "three_black_crows"),
  },
  {
    id: "pattern_hanging_man",
    label: "Hanging Man",
    abbreviation: "HANG",
    category: "pattern",
    description: "Hanging man — potential bearish reversal at top.",
    evaluate: (ctx) => patternResult(ctx, "hanging_man"),
  },
  {
    id: "pattern_inverted_hammer",
    label: "Inverted Hammer",
    abbreviation: "INV-H",
    category: "pattern",
    description: "Inverted hammer — potential bullish reversal at bottom.",
    evaluate: (ctx) => patternResult(ctx, "inverted_hammer"),
  },
  {
    id: "pattern_piercing",
    label: "Piercing Pattern",
    abbreviation: "PIERCE",
    category: "pattern",
    description: "Piercing line — bullish reversal.",
    evaluate: (ctx) => patternResult(ctx, "piercing_pattern"),
  },
  {
    id: "pattern_dark_cloud",
    label: "Dark Cloud Cover",
    abbreviation: "DARK",
    category: "pattern",
    description: "Dark cloud cover — bearish reversal.",
    evaluate: (ctx) => patternResult(ctx, "dark_cloud_cover"),
  },
  {
    id: "pattern_bullish_harami",
    label: "Bullish Harami",
    abbreviation: "B-HRMI",
    category: "pattern",
    description: "Bullish harami — potential reversal up.",
    evaluate: (ctx) => patternResult(ctx, "bullish_harami"),
  },
  {
    id: "pattern_bearish_harami",
    label: "Bearish Harami",
    abbreviation: "BR-HRMI",
    category: "pattern",
    description: "Bearish harami — potential reversal down.",
    evaluate: (ctx) => patternResult(ctx, "bearish_harami"),
  },

  // ──────────────── Mean reversion / range ────────────────
  {
    id: "near_52w_low",
    label: "Near 52-Week Low",
    abbreviation: "52wLOW",
    category: "mean_reversion",
    description: "Close within 5% of its 52-week low.",
    evaluate: (ctx) => {
      const v = latest(ctx.pctFrom52wLow, ctx.i);
      return {
        triggered: v != null && v <= 5,
        displayValue: v == null ? "52w low: n/a" : `${fmt(v, 1)}% above 52w low`,
      };
    },
  },
  {
    id: "near_52w_high",
    label: "Near 52-Week High",
    abbreviation: "52wHIGH",
    category: "mean_reversion",
    description: "Close within 5% of its 52-week high.",
    evaluate: (ctx) => {
      const v = latest(ctx.pctFrom52wHigh, ctx.i);
      return {
        triggered: v != null && v >= -5,
        displayValue:
          v == null ? "52w high: n/a" : `${fmt(v, 1)}% vs 52w high`,
      };
    },
  },
];

export const INDICATOR_REGISTRY: Record<string, IndicatorDef> = Object.freeze(
  Object.fromEntries(REGISTRY.map((d) => [d.id, d])),
);

export const INDICATOR_METADATA: IndicatorMeta[] = REGISTRY.map(
  ({ id, label, abbreviation, category, description }) => ({
    id,
    label,
    abbreviation,
    category,
    description,
  }),
).sort((a, b) => a.label.localeCompare(b.label));

export const INDICATOR_IDS: IndicatorId[] = REGISTRY.map((d) => d.id);

export function isIndicatorId(value: unknown): value is IndicatorId {
  return typeof value === "string" && value in INDICATOR_REGISTRY;
}

export const CATEGORIES: IndicatorCategory[] = [
  "momentum",
  "trend",
  "volatility",
  "volume",
  "pattern",
  "mean_reversion",
];
