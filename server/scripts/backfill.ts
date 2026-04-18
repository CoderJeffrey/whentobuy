import "dotenv/config";
import YahooFinance from "yahoo-finance2";
import type { ChartResultArray } from "yahoo-finance2/modules/chart";
import { closeDb, getDb, recreateIndicatorsTable } from "../src/db.js";
import { computeIndicators } from "../src/indicators.js";

const TICKER = "AAPL";
const yahooFinance = new YahooFinance();
yahooFinance._notices.suppress(["yahooSurvey", "ripHistorical"]);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function num(v: number | null | undefined): string {
  return v == null ? "NULL" : String(v);
}

async function main() {
  console.log(`[backfill] fetching 3y of ${TICKER} from Yahoo Finance...`);

  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 3);

  let chart: ChartResultArray;
  try {
    chart = await yahooFinance.chart(TICKER, {
      period1,
      period2,
      interval: "1d",
      return: "array",
    });
  } catch (err) {
    console.error("[backfill] Yahoo Finance request failed:", err);
    process.exit(1);
  }

  const quotes = chart.quotes.filter(
    (q) =>
      q.open != null &&
      q.high != null &&
      q.low != null &&
      q.close != null &&
      q.volume != null,
  );

  if (quotes.length === 0) {
    console.error("[backfill] no quotes returned — aborting");
    process.exit(1);
  }

  console.log(`[backfill] got ${quotes.length} daily bars`);

  const db = await getDb();

  await db.run("DELETE FROM prices");
  await recreateIndicatorsTable(db);

  const priceValuesSql = quotes
    .map((q) => {
      const d = sqlLit(isoDate(q.date));
      const adj = q.adjclose ?? q.close;
      return `(${d}, ${q.open}, ${q.high}, ${q.low}, ${q.close}, ${adj}, ${q.volume})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO prices (date, open, high, low, close, adj_close, volume) VALUES\n${priceValuesSql}`,
  );

  console.log(`[backfill] inserted ${quotes.length} price rows`);

  const closes = quotes.map((q) => q.close as number);
  const volumes = quotes.map((q) => q.volume as number);
  const ind = computeIndicators(closes, volumes);

  const indicatorValuesSql = quotes
    .map((q, i) => {
      const d = sqlLit(isoDate(q.date));
      const cols = [
        num(ind.rsi14[i]),
        num(ind.sma20[i]),
        num(ind.sma50[i]),
        num(ind.sma200[i]),
        num(ind.macd[i]),
        num(ind.macdSignal[i]),
        ind.macdCrossUp[i] == null ? "NULL" : String(ind.macdCrossUp[i]),
        num(ind.bbLower[i]),
        num(ind.pctFrom52wLow[i]),
        num(ind.volumeAvg20[i]),
      ];
      return `(${d}, ${cols.join(", ")})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO indicators (date, rsi_14, sma_20, sma_50, sma_200, macd, macd_signal, macd_cross_up, bb_lower, pct_from_52w_low, volume_avg_20) VALUES\n${indicatorValuesSql}`,
  );

  console.log(`[backfill] inserted ${quotes.length} indicator rows`);

  const lastIdx = quotes.length - 1;
  const lastQuote = quotes[lastIdx]!;
  console.log(
    `[backfill] latest: ${isoDate(lastQuote.date)} close=${lastQuote.close} RSI=${ind.rsi14[lastIdx]?.toFixed(2) ?? "n/a"} SMA200=${ind.sma200[lastIdx]?.toFixed(2) ?? "n/a"} SMA50=${ind.sma50[lastIdx]?.toFixed(2) ?? "n/a"} SMA20=${ind.sma20[lastIdx]?.toFixed(2) ?? "n/a"}`,
  );

  await closeDb();
  console.log("[backfill] done.");
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
