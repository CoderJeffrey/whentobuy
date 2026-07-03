import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildEvalContext } from "./eval-context.js";
import { INDICATOR_REGISTRY } from "./indicator-registry.js";
import type { PriceRow } from "./types.js";

function isoDaysFrom(start: string, count: number): string[] {
  const t0 = Date.parse(start);
  return Array.from({ length: count }, (_, k) =>
    new Date(t0 + k * 86_400_000).toISOString().slice(0, 10),
  );
}

function bar(
  date: string,
  low: number,
  high: number,
  close: number,
): PriceRow {
  return { date, open: close, high, low, close, volume: 1_000 };
}

// ── ytd_low_second_touch ──────────────────────────────────────────

function retestScenario(): PriceRow[] {
  const dates = isoDaysFrom("2025-01-01", 21);
  const rows: PriceRow[] = [];
  // Days 0-4: touch episode 1 (lows within 5% of trailing YTD low 100).
  rows.push(bar(dates[0]!, 100, 105, 102));
  for (let k = 1; k <= 4; k++) rows.push(bar(dates[k]!, 102, 107, 104));
  // Days 5-19: rally, well above the band.
  for (let k = 5; k <= 19; k++) rows.push(bar(dates[k]!, 120, 125, 123));
  // Day 20: retest 16 calendar days after the last touch -> episode 2.
  rows.push(bar(dates[20]!, 103, 108, 105));
  return rows;
}

test("ytd_low_second_touch triggers on the retest of the YTD low", () => {
  const ctx = buildEvalContext(retestScenario());
  assert.equal(ctx.ytdLowTouchEpisode[0], 1);
  assert.equal(ctx.ytdLowTouchEpisode[10], null);
  assert.equal(ctx.ytdLowTouchEpisode[20], 2);
  const result = INDICATOR_REGISTRY["ytd_low_second_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, true);
  assert.match(result.displayValue, /#2/);
});

test("ytd_low_second_touch stays off during the first episode and the rally", () => {
  const ctx = buildEvalContext(retestScenario().slice(0, 15));
  const result = INDICATOR_REGISTRY["ytd_low_second_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, false);
  assert.equal(result.displayValue, "23.0% above YTD low");
});

test("ytd_low_second_touch episode count resets on a new year", () => {
  const rows = [
    bar("2024-12-20", 100, 105, 102),
    bar("2024-12-21", 101, 106, 103),
    bar("2024-12-22", 102, 107, 104),
    // 14-day gap would be episode 2 without the January reset.
    bar("2025-01-05", 101, 106, 103),
  ];
  const ctx = buildEvalContext(rows);
  assert.equal(ctx.ytdLowTouchEpisode[3], 1);
  const result = INDICATOR_REGISTRY["ytd_low_second_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, false);
});

// ── sma200_first_touch ────────────────────────────────────────────

function smaScenario(): PriceRow[] {
  // Steep linear ramp keeps price ~45% above SMA-200, so no touch during warmup.
  const dates = isoDaysFrom("2025-01-01", 224);
  const rows: PriceRow[] = [];
  for (let i = 0; i < 224; i++) {
    const close = 100 + i;
    rows.push(bar(dates[i]!, close - 1, close + 1, close));
  }
  // Bar 220: first dip into the SMA-200 ±5% band. Bar 223: second dip.
  rows[220] = bar(dates[220]!, 150, 310, 300);
  rows[223] = bar(dates[223]!, 150, 310, 300);
  return rows;
}

test("sma200_first_touch fires on the year's first touch of the band", () => {
  const ctx = buildEvalContext(smaScenario().slice(0, 221));
  assert.equal(ctx.sma200FirstTouch[220], true);
  const result = INDICATOR_REGISTRY["sma200_first_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, true);
  assert.equal(result.displayValue, "First touch today");
});

test("sma200_first_touch stays on for 3 bars after the touch", () => {
  const ctx = buildEvalContext(smaScenario().slice(0, 223));
  const result = INDICATOR_REGISTRY["sma200_first_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, true);
  assert.equal(result.displayValue, "First touch 2d ago");
});

test("sma200_first_touch ignores later touches in the same year", () => {
  const ctx = buildEvalContext(smaScenario());
  assert.equal(ctx.sma200FirstTouch[223], false);
  const result = INDICATOR_REGISTRY["sma200_first_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, false);
});

test("sma200_first_touch stays off before any touch", () => {
  const ctx = buildEvalContext(smaScenario().slice(0, 220));
  const result = INDICATOR_REGISTRY["sma200_first_touch"]!.evaluate(ctx);
  assert.equal(result.triggered, false);
});
