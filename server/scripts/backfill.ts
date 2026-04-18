import "dotenv/config";
import YahooFinance from "yahoo-finance2";
import type { ChartResultArray } from "yahoo-finance2/modules/chart";
import { closeDb, getDb } from "../src/db.js";
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

  await db.run("DELETE FROM indicators");
  await db.run("DELETE FROM prices");

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
  const { rsi14, sma200, macd, macdSignal, macdCrossUp } =
    computeIndicators(closes);

  const indicatorValuesSql = quotes
    .map((q, i) => {
      const d = sqlLit(isoDate(q.date));
      const rsi = rsi14[i] == null ? "NULL" : String(rsi14[i]);
      const sma = sma200[i] == null ? "NULL" : String(sma200[i]);
      const m = macd[i] == null ? "NULL" : String(macd[i]);
      const s = macdSignal[i] == null ? "NULL" : String(macdSignal[i]);
      const x = macdCrossUp[i] == null ? "NULL" : String(macdCrossUp[i]);
      return `(${d}, ${rsi}, ${sma}, ${m}, ${s}, ${x})`;
    })
    .join(",\n");

  await db.run(
    `INSERT INTO indicators (date, rsi_14, sma_200, macd, macd_signal, macd_cross_up) VALUES\n${indicatorValuesSql}`,
  );

  console.log(`[backfill] inserted ${quotes.length} indicator rows`);

  const lastQuote = quotes[quotes.length - 1]!;
  const lastRsi = rsi14[rsi14.length - 1];
  const lastSma = sma200[sma200.length - 1];
  console.log(
    `[backfill] latest: ${isoDate(lastQuote.date)} close=${lastQuote.close} RSI-14=${lastRsi?.toFixed(2) ?? "n/a"} SMA-200=${lastSma?.toFixed(2) ?? "n/a"}`,
  );

  await closeDb();
  console.log("[backfill] done.");
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
