import pkg from "technicalindicators";
import type { PriceRow } from "./types.js";

const {
  RSI,
  SMA,
  EMA,
  WMA,
  MACD,
  BollingerBands,
  KeltnerChannels,
  ATR,
  Stochastic,
  WilliamsR,
  CCI,
  MFI,
  ROC,
  TRIX,
  KST,
  AwesomeOscillator,
  ADX,
  PSAR,
  OBV,
  ForceIndex,
  ADL,
  bullishengulfingpattern,
  bearishengulfingpattern,
  bullishhammerstick,
  bearishhammerstick,
  bullishinvertedhammerstick,
  bearishinvertedhammerstick,
  hammerpattern,
  shootingstar,
  hangingman,
  morningstar,
  eveningstar,
  doji,
  threewhitesoldiers,
  threeblackcrows,
  bullishharami,
  bearishharami,
  piercingline,
  darkcloudcover,
} = pkg;

export type Series<T = number> = (T | null)[];

export interface PatternHit {
  fired: boolean;
  daysAgo: number | null;
}

export interface EvalContext {
  i: number;

  // OHLCV (length n)
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];

  // Price-derived
  pctFrom52wLow: Series;
  pctFrom52wHigh: Series;

  // Momentum
  rsi14: Series;
  stochK: Series;
  stochD: Series;
  williamsR14: Series;
  cci20: Series;
  mfi14: Series;
  roc12: Series;
  momentum10: Series;
  trix15: Series;
  trixCrossUp: Series<boolean>;
  trixCrossDown: Series<boolean>;
  kst: Series;
  kstSignal: Series;
  kstCrossUp: Series<boolean>;
  kstCrossDown: Series<boolean>;
  ultOsc: Series;
  ao: Series;
  macd: Series;
  macdSignal: Series;
  macdCrossUp: Series<boolean>;
  macdCrossDown: Series<boolean>;

  // Trend
  sma20: Series;
  sma50: Series;
  sma200: Series;
  ema20: Series;
  ema50: Series;
  ema200: Series;
  wma20: Series;
  wma50: Series;
  dema20: Series;
  tema20: Series;
  adx14: Series;
  aroonUp25: Series;
  aroonDown25: Series;
  psar: Series;

  // Volatility
  bbUpper: Series;
  bbMid: Series;
  bbLower: Series;
  bbWidth: Series;
  bbWidthAvg100: Series;
  kcUpper: Series;
  kcMid: Series;
  kcLower: Series;
  atr14: Series;
  atrAvg100: Series;
  donchUpper20: Series;
  donchLower20: Series;

  // Volume
  volumeAvg20: Series;
  obv: Series;
  obvSlope5: Series;
  vpt: Series;
  vptSlope5: Series;
  ad: Series;
  adSlope5: Series;
  cmf20: Series;
  forceIndex13: Series;
  eom14: Series;

  // Patterns (latest-bar lookback summary)
  patterns: Record<string, PatternHit>;
}

function rightAlign<T>(values: T[], length: number): Series<T> {
  const padLen = length - values.length;
  if (padLen <= 0) return values.slice(0, length) as Series<T>;
  return [...new Array<T | null>(padLen).fill(null), ...values];
}

function slopeN(series: Series, n: number): Series {
  const out: Series = new Array<number | null>(series.length).fill(null);
  for (let i = n; i < series.length; i++) {
    const a = series[i - n];
    const b = series[i];
    if (a == null || b == null) continue;
    out[i] = b - a;
  }
  return out;
}

function rollingAvg(series: Series, period: number): Series {
  const out: Series = new Array<number | null>(series.length).fill(null);
  for (let i = period - 1; i < series.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = series[j];
      if (v == null) continue;
      sum += v;
      count++;
    }
    if (count > 0) out[i] = sum / count;
  }
  return out;
}

function aroonSeries(
  highs: number[],
  lows: number[],
  period = 25,
): { up: Series; down: Series } {
  const n = highs.length;
  const up: Series = new Array<number | null>(n).fill(null);
  const down: Series = new Array<number | null>(n).fill(null);
  for (let i = period; i < n; i++) {
    let highIdx = i;
    let lowIdx = i;
    let highVal = -Infinity;
    let lowVal = Infinity;
    for (let j = i - period; j <= i; j++) {
      const h = highs[j]!;
      const l = lows[j]!;
      if (h > highVal) {
        highVal = h;
        highIdx = j;
      }
      if (l < lowVal) {
        lowVal = l;
        lowIdx = j;
      }
    }
    up[i] = ((period - (i - highIdx)) / period) * 100;
    down[i] = ((period - (i - lowIdx)) / period) * 100;
  }
  return { up, down };
}

function donchianSeries(
  highs: number[],
  lows: number[],
  period = 20,
): { upper: Series; lower: Series } {
  const n = highs.length;
  const upper: Series = new Array<number | null>(n).fill(null);
  const lower: Series = new Array<number | null>(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    let h = -Infinity;
    let l = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      h = Math.max(h, highs[j]!);
      l = Math.min(l, lows[j]!);
    }
    upper[i] = h;
    lower[i] = l;
  }
  return { upper, lower };
}

function vptSeries(closes: number[], volumes: number[]): Series {
  const n = closes.length;
  const out: Series = new Array<number | null>(n).fill(null);
  if (n === 0) return out;
  out[0] = 0;
  for (let i = 1; i < n; i++) {
    const prev = out[i - 1];
    const c = closes[i]!;
    const cPrev = closes[i - 1]!;
    if (prev == null || cPrev === 0) {
      out[i] = prev ?? null;
      continue;
    }
    out[i] = prev + volumes[i]! * ((c - cPrev) / cPrev);
  }
  return out;
}

function cmfSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 20,
): Series {
  const n = closes.length;
  const out: Series = new Array<number | null>(n).fill(null);
  const mfv: number[] = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const range = highs[i]! - lows[i]!;
    const mf =
      range === 0
        ? 0
        : (closes[i]! - lows[i]! - (highs[i]! - closes[i]!)) / range;
    mfv[i] = mf * volumes[i]!;
  }
  for (let i = period - 1; i < n; i++) {
    let mfvSum = 0;
    let volSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      mfvSum += mfv[j]!;
      volSum += volumes[j]!;
    }
    out[i] = volSum === 0 ? null : mfvSum / volSum;
  }
  return out;
}

function eomSeries(
  highs: number[],
  lows: number[],
  volumes: number[],
  period = 14,
): Series {
  const n = highs.length;
  const raw: number[] = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dm =
      (highs[i]! + lows[i]!) / 2 - (highs[i - 1]! + lows[i - 1]!) / 2;
    const range = highs[i]! - lows[i]!;
    const v = volumes[i]!;
    const br = range === 0 || v === 0 ? 0 : v / 100_000_000 / range;
    raw[i] = br === 0 ? 0 : dm / br;
  }
  return rightAlign(SMA.calculate({ values: raw, period }), n);
}

function ultOscSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  p1 = 7,
  p2 = 14,
  p3 = 28,
): Series {
  const n = closes.length;
  const out: Series = new Array<number | null>(n).fill(null);
  if (n < 2) return out;
  // bp[k] / tr[k] correspond to bar at index k+1 (need previous close).
  const bp: number[] = new Array<number>(n - 1).fill(0);
  const tr: number[] = new Array<number>(n - 1).fill(0);
  for (let i = 1; i < n; i++) {
    const trueLow = Math.min(lows[i]!, closes[i - 1]!);
    const trueHigh = Math.max(highs[i]!, closes[i - 1]!);
    bp[i - 1] = closes[i]! - trueLow;
    tr[i - 1] = trueHigh - trueLow;
  }
  function avg(end: number, period: number): number | null {
    if (end - period + 1 < 0) return null;
    let bSum = 0;
    let tSum = 0;
    for (let j = end - period + 1; j <= end; j++) {
      bSum += bp[j]!;
      tSum += tr[j]!;
    }
    return tSum === 0 ? null : bSum / tSum;
  }
  for (let i = p3; i < n; i++) {
    const k = i - 1;
    const a = avg(k, p1);
    const b = avg(k, p2);
    const c = avg(k, p3);
    if (a == null || b == null || c == null) continue;
    out[i] = (100 * (4 * a + 2 * b + c)) / 7;
  }
  return out;
}

function demaSeries(closes: number[], period: number): Series {
  const n = closes.length;
  const ema1 = EMA.calculate({ values: closes, period });
  if (ema1.length === 0) return new Array<number | null>(n).fill(null);
  const ema2 = EMA.calculate({ values: ema1, period });
  const out: Series = new Array<number | null>(n).fill(null);
  // ema1[k] aligns with closes[k + period - 1]
  // ema2[k] aligns with ema1[k + period - 1] -> closes[k + 2*period - 2]
  for (let k = 0; k < ema2.length; k++) {
    const ci = k + 2 * period - 2;
    if (ci >= n) break;
    out[ci] = 2 * ema1[k + period - 1]! - ema2[k]!;
  }
  return out;
}

function temaSeries(closes: number[], period: number): Series {
  const n = closes.length;
  const ema1 = EMA.calculate({ values: closes, period });
  if (ema1.length === 0) return new Array<number | null>(n).fill(null);
  const ema2 = EMA.calculate({ values: ema1, period });
  if (ema2.length === 0) return new Array<number | null>(n).fill(null);
  const ema3 = EMA.calculate({ values: ema2, period });
  const out: Series = new Array<number | null>(n).fill(null);
  for (let k = 0; k < ema3.length; k++) {
    const ci = k + 3 * (period - 1);
    if (ci >= n) break;
    const e1 = ema1[k + 2 * (period - 1)]!;
    const e2 = ema2[k + (period - 1)]!;
    const e3 = ema3[k]!;
    out[ci] = 3 * e1 - 3 * e2 + e3;
  }
  return out;
}

function detectCross(
  series: Series,
  threshold = 0,
): { up: Series<boolean>; down: Series<boolean> } {
  const n = series.length;
  const up: Series<boolean> = new Array<boolean | null>(n).fill(null);
  const down: Series<boolean> = new Array<boolean | null>(n).fill(null);
  for (let i = 1; i < n; i++) {
    const a = series[i - 1];
    const b = series[i];
    if (a == null || b == null) continue;
    up[i] = a <= threshold && b > threshold;
    down[i] = a >= threshold && b < threshold;
  }
  return { up, down };
}

function detectCrossPair(
  a: Series,
  b: Series,
): { up: Series<boolean>; down: Series<boolean> } {
  const n = a.length;
  const up: Series<boolean> = new Array<boolean | null>(n).fill(null);
  const down: Series<boolean> = new Array<boolean | null>(n).fill(null);
  for (let i = 1; i < n; i++) {
    const a0 = a[i - 1];
    const a1 = a[i];
    const b0 = b[i - 1];
    const b1 = b[i];
    if (a0 == null || a1 == null || b0 == null || b1 == null) continue;
    up[i] = a0 <= b0 && a1 > b1;
    down[i] = a0 >= b0 && a1 < b1;
  }
  return { up, down };
}

type PatternFn = (input: {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
}) => boolean;

const PATTERN_FNS: Record<string, PatternFn> = {
  hammer: hammerpattern as PatternFn,
  shooting_star: shootingstar as PatternFn,
  bullish_engulfing: bullishengulfingpattern as PatternFn,
  bearish_engulfing: bearishengulfingpattern as PatternFn,
  morning_star: morningstar as PatternFn,
  evening_star: eveningstar as PatternFn,
  doji: doji as PatternFn,
  three_white_soldiers: threewhitesoldiers as PatternFn,
  three_black_crows: threeblackcrows as PatternFn,
  hanging_man: hangingman as PatternFn,
  inverted_hammer: bullishinvertedhammerstick as PatternFn,
  piercing_pattern: piercingline as PatternFn,
  dark_cloud_cover: darkcloudcover as PatternFn,
  bullish_harami: bullishharami as PatternFn,
  bearish_harami: bearishharami as PatternFn,
  // bonus shapes used for dev/debug; not exposed as separate indicators
  bullish_hammer_stick: bullishhammerstick as PatternFn,
  bearish_hammer_stick: bearishhammerstick as PatternFn,
  bearish_inverted_hammer: bearishinvertedhammerstick as PatternFn,
};

function checkPatternRecent(
  fn: PatternFn,
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  lookback = 3,
): PatternHit {
  for (let back = 0; back < lookback; back++) {
    const end = closes.length - back;
    if (end < 5) break;
    try {
      const fired = fn({
        open: opens.slice(0, end),
        high: highs.slice(0, end),
        low: lows.slice(0, end),
        close: closes.slice(0, end),
      });
      if (fired) return { fired: true, daysAgo: back };
    } catch {
      // some pattern fns throw on too-short input; treat as no fire
    }
  }
  return { fired: false, daysAgo: null };
}

export function buildEvalContext(prices: PriceRow[]): EvalContext {
  const n = prices.length;
  const opens = prices.map((p) => p.open);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);
  const closes = prices.map((p) => p.close);
  const volumes = prices.map((p) => p.volume);

  // 52-week range
  const W = 252;
  const pctFrom52wLow: Series = new Array<number | null>(n).fill(null);
  const pctFrom52wHigh: Series = new Array<number | null>(n).fill(null);
  for (let i = W - 1; i < n; i++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = i - W + 1; j <= i; j++) {
      lo = Math.min(lo, closes[j]!);
      hi = Math.max(hi, closes[j]!);
    }
    if (lo > 0) pctFrom52wLow[i] = ((closes[i]! - lo) / lo) * 100;
    if (hi > 0) pctFrom52wHigh[i] = ((closes[i]! - hi) / hi) * 100;
  }

  // Momentum
  const rsi14 = rightAlign(RSI.calculate({ values: closes, period: 14 }), n);

  const stochRaw = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3,
  });
  const stochK = rightAlign(
    stochRaw.map((s) => s.k as number),
    n,
  );
  const stochD = rightAlign(
    stochRaw.map((s) => s.d as number),
    n,
  );

  const williamsR14 = rightAlign(
    WilliamsR.calculate({ high: highs, low: lows, close: closes, period: 14 }),
    n,
  );

  const cci20 = rightAlign(
    CCI.calculate({ high: highs, low: lows, close: closes, period: 20 }),
    n,
  );

  const mfi14 = rightAlign(
    MFI.calculate({
      high: highs,
      low: lows,
      close: closes,
      volume: volumes,
      period: 14,
    }),
    n,
  );

  const roc12 = rightAlign(ROC.calculate({ values: closes, period: 12 }), n);

  const momentum10: Series = new Array<number | null>(n).fill(null);
  for (let i = 10; i < n; i++) momentum10[i] = closes[i]! - closes[i - 10]!;

  const trix15 = rightAlign(TRIX.calculate({ values: closes, period: 15 }), n);
  const { up: trixCrossUp, down: trixCrossDown } = detectCross(trix15, 0);

  const kstRaw = KST.calculate({
    values: closes,
    ROCPer1: 10,
    ROCPer2: 15,
    ROCPer3: 20,
    ROCPer4: 30,
    SMAROCPer1: 10,
    SMAROCPer2: 10,
    SMAROCPer3: 10,
    SMAROCPer4: 15,
    signalPeriod: 9,
  });
  const kst = rightAlign(
    kstRaw.map((k) => (k.kst ?? null) as number | null),
    n,
  );
  const kstSignal = rightAlign(
    kstRaw.map((k) => (k.signal ?? null) as number | null),
    n,
  );
  const { up: kstCrossUp, down: kstCrossDown } = detectCrossPair(kst, kstSignal);

  const ultOsc = ultOscSeries(highs, lows, closes);
  const ao = rightAlign(
    AwesomeOscillator.calculate({
      high: highs,
      low: lows,
      fastPeriod: 5,
      slowPeriod: 34,
    }),
    n,
  );

  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const macd = rightAlign(
    macdRaw.map((m) => (m.MACD ?? null) as number | null),
    n,
  );
  const macdSignal = rightAlign(
    macdRaw.map((m) => (m.signal ?? null) as number | null),
    n,
  );
  const { up: macdCrossUp, down: macdCrossDown } = detectCrossPair(
    macd,
    macdSignal,
  );

  // Trend
  const sma20 = rightAlign(SMA.calculate({ values: closes, period: 20 }), n);
  const sma50 = rightAlign(SMA.calculate({ values: closes, period: 50 }), n);
  const sma200 = rightAlign(SMA.calculate({ values: closes, period: 200 }), n);
  const ema20 = rightAlign(EMA.calculate({ values: closes, period: 20 }), n);
  const ema50 = rightAlign(EMA.calculate({ values: closes, period: 50 }), n);
  const ema200 = rightAlign(EMA.calculate({ values: closes, period: 200 }), n);
  const wma20 = rightAlign(WMA.calculate({ values: closes, period: 20 }), n);
  const wma50 = rightAlign(WMA.calculate({ values: closes, period: 50 }), n);
  const dema20 = demaSeries(closes, 20);
  const tema20 = temaSeries(closes, 20);

  const adx14 = rightAlign(
    ADX.calculate({ high: highs, low: lows, close: closes, period: 14 }).map(
      (a) => (a.adx ?? null) as number | null,
    ),
    n,
  );

  const { up: aroonUp25, down: aroonDown25 } = aroonSeries(highs, lows, 25);

  const psar = rightAlign(
    PSAR.calculate({ high: highs, low: lows, step: 0.02, max: 0.2 }),
    n,
  );

  // Volatility
  const bbRaw = BollingerBands.calculate({
    values: closes,
    period: 20,
    stdDev: 2,
  });
  const bbUpper = rightAlign(
    bbRaw.map((b) => b.upper),
    n,
  );
  const bbMid = rightAlign(
    bbRaw.map((b) => b.middle),
    n,
  );
  const bbLower = rightAlign(
    bbRaw.map((b) => b.lower),
    n,
  );
  const bbWidth: Series = bbUpper.map((u, i) => {
    const l = bbLower[i];
    const m = bbMid[i];
    if (u == null || l == null || m == null || m === 0) return null;
    return (u - l) / m;
  });
  const bbWidthAvg100 = rollingAvg(bbWidth, 100);

  const kcRaw = KeltnerChannels.calculate({
    high: highs,
    low: lows,
    close: closes,
    maPeriod: 20,
    atrPeriod: 10,
    multiplier: 2,
    useSMA: false,
  });
  const kcUpper = rightAlign(
    kcRaw.map((k) => k.upper as number),
    n,
  );
  const kcMid = rightAlign(
    kcRaw.map((k) => k.middle as number),
    n,
  );
  const kcLower = rightAlign(
    kcRaw.map((k) => k.lower as number),
    n,
  );

  const atr14 = rightAlign(
    ATR.calculate({ high: highs, low: lows, close: closes, period: 14 }),
    n,
  );
  const atrAvg100 = rollingAvg(atr14, 100);

  const { upper: donchUpper20, lower: donchLower20 } = donchianSeries(
    highs,
    lows,
    20,
  );

  // Volume
  const volumeAvg20 = rightAlign(
    SMA.calculate({ values: volumes, period: 20 }),
    n,
  );
  const obv = rightAlign(OBV.calculate({ close: closes, volume: volumes }), n);
  const obvSlope5 = slopeN(obv, 5);
  const vpt = vptSeries(closes, volumes);
  const vptSlope5 = slopeN(vpt, 5);
  const ad = rightAlign(
    ADL.calculate({
      high: highs,
      low: lows,
      close: closes,
      volume: volumes,
    }),
    n,
  );
  const adSlope5 = slopeN(ad, 5);
  const cmf20 = cmfSeries(highs, lows, closes, volumes, 20);
  const forceIndex13 = rightAlign(
    ForceIndex.calculate({ close: closes, volume: volumes, period: 13 }),
    n,
  );
  const eom14 = eomSeries(highs, lows, volumes, 14);

  // Patterns
  const patterns: Record<string, PatternHit> = {};
  for (const [name, fn] of Object.entries(PATTERN_FNS)) {
    patterns[name] = checkPatternRecent(fn, opens, highs, lows, closes, 3);
  }

  return {
    i: n - 1,
    opens,
    highs,
    lows,
    closes,
    volumes,
    pctFrom52wLow,
    pctFrom52wHigh,
    rsi14,
    stochK,
    stochD,
    williamsR14,
    cci20,
    mfi14,
    roc12,
    momentum10,
    trix15,
    trixCrossUp,
    trixCrossDown,
    kst,
    kstSignal,
    kstCrossUp,
    kstCrossDown,
    ultOsc,
    ao,
    macd,
    macdSignal,
    macdCrossUp,
    macdCrossDown,
    sma20,
    sma50,
    sma200,
    ema20,
    ema50,
    ema200,
    wma20,
    wma50,
    dema20,
    tema20,
    adx14,
    aroonUp25,
    aroonDown25,
    psar,
    bbUpper,
    bbMid,
    bbLower,
    bbWidth,
    bbWidthAvg100,
    kcUpper,
    kcMid,
    kcLower,
    atr14,
    atrAvg100,
    donchUpper20,
    donchLower20,
    volumeAvg20,
    obv,
    obvSlope5,
    vpt,
    vptSlope5,
    ad,
    adSlope5,
    cmf20,
    forceIndex13,
    eom14,
    patterns,
  };
}
