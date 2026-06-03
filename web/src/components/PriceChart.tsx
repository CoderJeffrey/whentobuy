import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  TIMEFRAMES,
  TIMEFRAME_LABELS,
  type PriceChart as PriceChartData,
  type Timeframe,
} from "../types";

type Range = "1M" | "6M" | "1Y" | "3Y";
const RANGES: Range[] = ["1M", "6M", "1Y", "3Y"];

const TF_KEY = "chart_timeframe";
const RANGE_KEY = "chart_range";

function daysBack(r: Range): number {
  if (r === "1M") return 31;
  if (r === "6M") return 183;
  if (r === "1Y") return 365;
  return 365 * 3 + 5;
}

function toUtc(dateIso: string): UTCTimestamp {
  return (new Date(`${dateIso}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}

function loadTimeframe(): Timeframe {
  const v = localStorage.getItem(TF_KEY);
  return v === "weekly" || v === "monthly" || v === "daily" ? v : "daily";
}

function loadRange(): Range {
  const v = localStorage.getItem(RANGE_KEY);
  return RANGES.includes(v as Range) ? (v as Range) : "6M";
}

export function PriceChart({ priceChart }: { priceChart: PriceChartData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>(loadTimeframe);
  const [range, setRange] = useState<Range>(loadRange);

  useEffect(() => {
    localStorage.setItem(TF_KEY, timeframe);
  }, [timeframe]);
  useEffect(() => {
    localStorage.setItem(RANGE_KEY, range);
  }, [range]);

  const series = priceChart[timeframe];

  const candles: CandlestickData<Time>[] = useMemo(
    () =>
      series.bars.map((p) => ({
        time: toUtc(p.date),
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      })),
    [series],
  );

  const smaLine: LineData<Time>[] = useMemo(
    () =>
      series.sma200.map((s) => ({
        time: toUtc(s.date),
        value: s.value,
      })),
    [series],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Monochrome dark theme — same widget, dark palette only.
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "rgba(0,0,0,0)" },
        textColor: "rgba(255,255,255,0.45)",
        fontFamily:
          '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: false },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "rgba(255,255,255,0.92)",
      downColor: "rgba(255,255,255,0.18)",
      wickUpColor: "rgba(255,255,255,0.85)",
      wickDownColor: "rgba(255,255,255,0.4)",
      borderUpColor: "rgba(255,255,255,0.92)",
      borderDownColor: "rgba(255,255,255,0.45)",
      borderVisible: true,
    });
    const smaSeries = chart.addSeries(LineSeries, {
      color: "rgba(255,255,255,0.55)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "SMA-200",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    smaSeriesRef.current = smaSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      smaSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !smaSeriesRef.current)
      return;
    candleSeriesRef.current.setData(candles);
    smaSeriesRef.current.setData(smaLine);
    if (candles.length === 0) return;

    const lastTime = candles[candles.length - 1]!.time as UTCTimestamp;
    const secondsBack = daysBack(range) * 86400;
    const fromTime = (Number(lastTime) - secondsBack) as UTCTimestamp;
    chartRef.current.timeScale().setVisibleRange({
      from: fromTime,
      to: lastTime,
    });
  }, [candles, smaLine, range]);

  const empty = series.bars.length === 0;

  return (
    <div className="card chart-card">
      <div className="card-head">
        <span className="card-title">Price History</span>
        <div className="chart-controls">
          <div className="timeframes" role="tablist" data-testid="chart-tf">
            {TIMEFRAMES.map((tf) => {
              const active = tf === timeframe;
              return (
                <button
                  key={tf}
                  data-testid={`tf-bar-${tf}`}
                  data-active={active}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={active ? "active" : ""}
                >
                  {TIMEFRAME_LABELS[tf]}
                </button>
              );
            })}
          </div>
          <div className="timeframes" role="tablist" data-testid="chart-range">
            {RANGES.map((r) => {
              const active = r === range;
              return (
                <button
                  key={r}
                  data-testid={`tf-${r}`}
                  data-active={active}
                  type="button"
                  onClick={() => setRange(r)}
                  className={active ? "active" : ""}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="chart-wrap">
        <div
          ref={containerRef}
          data-testid="price-chart"
          className="chart-canvas"
        />
        {empty && (
          <div className="chart-empty" data-testid="chart-empty">
            {TIMEFRAME_LABELS[timeframe]} data unavailable
          </div>
        )}
      </div>
    </div>
  );
}
