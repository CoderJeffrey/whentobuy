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

type Timeframe = "6M" | "1Y" | "3Y";
const TIMEFRAMES: Timeframe[] = ["6M", "1Y", "3Y"];

function daysBack(tf: Timeframe): number {
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

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "#18181a" },
        textColor: "#9a968f",
        fontFamily:
          '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      },
      grid: {
        vertLines: { color: "#242428" },
        horzLines: { color: "#242428" },
      },
      rightPriceScale: { borderColor: "#2a2a2d" },
      timeScale: { borderColor: "#2a2a2d", timeVisible: false },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#7a9a7d",
      downColor: "#a66b6b",
      wickUpColor: "#7a9a7d",
      wickDownColor: "#a66b6b",
      borderVisible: false,
    });
    const smaSeries = chart.addSeries(LineSeries, {
      color: "#c9b896",
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
    <section
      className="rounded-2xl p-8 flex flex-col gap-6"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs tracking-label uppercase"
          style={{ color: "var(--text-secondary)", fontWeight: 500 }}
        >
          Price History
        </h3>
        <div
          className="inline-flex items-center rounded-lg p-1"
          style={{ backgroundColor: "var(--bg-subtle)" }}
          role="tablist"
        >
          {TIMEFRAMES.map((tf) => {
            const active = tf === timeframe;
            return (
              <button
                key={tf}
                data-testid={`tf-${tf}`}
                data-active={active}
                type="button"
                onClick={() => setTimeframe(tf)}
                className="px-3 py-1 text-xs rounded-md transition-colors tracking-label uppercase"
                style={{
                  backgroundColor: active
                    ? "var(--bg-card-raised)"
                    : "transparent",
                  color: active ? "var(--accent)" : "var(--text-tertiary)",
                  fontWeight: 500,
                }}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>
      <div
        ref={containerRef}
        data-testid="price-chart"
        className="w-full"
        style={{ height: 400 }}
      />
    </section>
  );
}
