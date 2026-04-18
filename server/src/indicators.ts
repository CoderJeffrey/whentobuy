import pkg from "technicalindicators";
const { RSI, SMA, MACD, BollingerBands } = pkg;

export interface ComputedIndicators {
  rsi14: (number | null)[];
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  macd: (number | null)[];
  macdSignal: (number | null)[];
  macdCrossUp: (boolean | null)[];
  bbLower: (number | null)[];
  pctFrom52wLow: (number | null)[];
  volumeAvg20: (number | null)[];
}

function rightAlign<T>(values: T[], length: number): (T | null)[] {
  const padLen = length - values.length;
  if (padLen <= 0) return values.slice(0, length);
  return [...Array<null>(padLen).fill(null), ...values];
}

export function computeIndicators(
  closes: number[],
  volumes: number[],
): ComputedIndicators {
  const n = closes.length;

  const rsi14 = rightAlign(RSI.calculate({ values: closes, period: 14 }), n);
  const sma20 = rightAlign(SMA.calculate({ values: closes, period: 20 }), n);
  const sma50 = rightAlign(SMA.calculate({ values: closes, period: 50 }), n);
  const sma200 = rightAlign(SMA.calculate({ values: closes, period: 200 }), n);
  const volumeAvg20 = rightAlign(
    SMA.calculate({ values: volumes, period: 20 }),
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
  const macdLine = rightAlign(
    macdRaw.map((m) => (m.MACD ?? null) as number | null),
    n,
  );
  const macdSignalLine = rightAlign(
    macdRaw.map((m) => (m.signal ?? null) as number | null),
    n,
  );

  const macdCrossUp: (boolean | null)[] = new Array<boolean | null>(n).fill(null);
  for (let i = 1; i < n; i++) {
    const m = macdLine[i];
    const s = macdSignalLine[i];
    const pm = macdLine[i - 1];
    const ps = macdSignalLine[i - 1];
    if (m == null || s == null || pm == null || ps == null) continue;
    macdCrossUp[i] = m > s && pm <= ps;
  }

  const bbRaw = BollingerBands.calculate({
    values: closes,
    period: 20,
    stdDev: 2,
  });
  const bbLower = rightAlign(
    bbRaw.map((b) => b.lower),
    n,
  );

  const WINDOW_52W = 252;
  const pctFrom52wLow: (number | null)[] = new Array<number | null>(n).fill(null);
  for (let i = WINDOW_52W - 1; i < n; i++) {
    let low = Infinity;
    for (let j = i - WINDOW_52W + 1; j <= i; j++) {
      const v = closes[j];
      if (v !== undefined && v < low) low = v;
    }
    const cur = closes[i];
    if (cur === undefined || low === Infinity || low <= 0) continue;
    pctFrom52wLow[i] = ((cur - low) / low) * 100;
  }

  return {
    rsi14,
    sma20,
    sma50,
    sma200,
    macd: macdLine,
    macdSignal: macdSignalLine,
    macdCrossUp,
    bbLower,
    pctFrom52wLow,
    volumeAvg20,
  };
}
