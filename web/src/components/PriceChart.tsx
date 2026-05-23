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
import type { PriceBar, SmaPoint } from "../types";

type Timeframe = "1M" | "6M" | "1Y" | "3Y";
const TIMEFRAMES: Timeframe[] = ["1M", "6M", "1Y", "3Y"];

function daysBack(tf: Timeframe): number {
  if (tf === "1M") return 31;
  if (tf === "6M") return 183;
  if (tf === "1Y") return 365;
  return 365 * 3 + 5;
}

function toUtc(dateIso: string): UTCTimestamp {
  return (new Date(`${dateIso}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}

export function PriceChart({
  priceHistory,
  sma200Series,
}: {
  priceHistory: PriceBar[];
  sma200Series: SmaPoint[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("6M");

  const candles: CandlestickData<Time>[] = useMemo(
    () =>
      priceHistory.map((p) => ({
        time: toUtc(p.date),
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      })),
    [priceHistory],
  );

  const smaLine: LineData<Time>[] = useMemo(
    () =>
      sma200Series.map((s) => ({
        time: toUtc(s.date),
        value: s.value,
      })),
    [sma200Series],
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
    if (candles.length === 0) return;
    candleSeriesRef.current.setData(candles);
    smaSeriesRef.current.setData(smaLine);

    const lastTime = candles[candles.length - 1]!.time as UTCTimestamp;
    const secondsBack = daysBack(timeframe) * 86400;
    const fromTime = (Number(lastTime) - secondsBack) as UTCTimestamp;
    chartRef.current.timeScale().setVisibleRange({
      from: fromTime,
      to: lastTime,
    });
  }, [candles, smaLine, timeframe]);

  return (
    <div className="card chart-card">
      <div className="card-head">
        <span className="card-title">Price history · daily</span>
        <div className="timeframes" role="tablist">
          {TIMEFRAMES.map((tf) => {
            const active = tf === timeframe;
            return (
              <button
                key={tf}
                data-testid={`tf-${tf}`}
                data-active={active}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={active ? "active" : ""}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>
      <div className="chart-wrap">
        <div
          ref={containerRef}
          data-testid="price-chart"
          style={{ width: "100%", height: 360 }}
        />
      </div>
    </div>
  );
}
