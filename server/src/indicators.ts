import pkg from "technicalindicators";
const { RSI, SMA, MACD } = pkg;

export interface ComputedIndicators {
  rsi14: (number | null)[];
  sma200: (number | null)[];
  macd: (number | null)[];
  macdSignal: (number | null)[];
  macdCrossUp: (boolean | null)[];
}

function rightAlign<T>(values: T[], length: number): (T | null)[] {
  const padLen = length - values.length;
  if (padLen <= 0) return values.slice(0, length);
  return [...Array<null>(padLen).fill(null), ...values];
}

export function computeIndicators(closes: number[]): ComputedIndicators {
  const n = closes.length;

  const rsi14 = rightAlign(RSI.calculate({ values: closes, period: 14 }), n);
  const sma200 = rightAlign(SMA.calculate({ values: closes, period: 200 }), n);

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

  return { rsi14, sma200, macd: macdLine, macdSignal: macdSignalLine, macdCrossUp };
}
