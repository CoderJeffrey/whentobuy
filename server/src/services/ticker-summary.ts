import { getDb } from "../db.js";
import { currencyFor, formatSymbol, parseSymbol } from "../lib/symbol.js";
import type { ComboStatus } from "../types.js";
import { evaluateCombos, listCombos } from "./combos.js";
import { getSecurity } from "./securities.js";
import { ctxByTimeframe, loadTimeframeData } from "./timeframe-data.js";

export interface TickerSummary {
  symbol: string;
  ticker: string;
  exchange: string;
  currency: string;
  name: string;
  dataReady: boolean;
  currentPrice?: number;
  priceChange?: number;
  priceChangePct?: number;
  combos?: ComboStatus[];
  greenComboCount?: number;
  totalCombos?: number;
  anyGreen?: boolean;
  asOf?: string;
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function isReady(ticker: string, exchange: string): Promise<boolean> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT status FROM ticker_cache WHERE ticker = ${sqlLit(ticker)} AND exchange = ${sqlLit(exchange)} AND timeframe = 'daily'`,
  );
  const rows = reader.getRowObjectsJS();
  return rows.length > 0 && rows[0]!.status === "ok";
}

export async function getTickerSummary(
  userId: string,
  symbolInput: string,
): Promise<TickerSummary> {
  const parsed = parseSymbol(symbolInput);
  const ticker = parsed?.ticker ?? symbolInput.toUpperCase();
  const exchange = parsed?.exchange ?? "US";
  const symbol = formatSymbol(ticker, exchange);
  const currency = currencyFor(exchange);
  const security = await getSecurity(ticker, exchange);
  const name = security?.name ?? ticker;
  const base = { symbol, ticker, exchange, currency, name };
  const ready = await isReady(ticker, exchange);
  if (!ready) return { ...base, dataReady: false };

  const data = await loadTimeframeData(ticker, exchange);
  const daily = data.daily;
  if (!daily || daily.bars.length === 0) return { ...base, dataReady: false };

  const bars = daily.bars;
  const latest = bars[bars.length - 1]!;
  const prev = bars[bars.length - 2];
  const priceChange = prev ? latest.close - prev.close : 0;
  const priceChangePct = prev ? (priceChange / prev.close) * 100 : 0;

  const combos = await listCombos(userId);
  const statuses = await evaluateCombos(combos, ctxByTimeframe(data));
  const greenComboCount = statuses.filter((s) => s.green).length;

  return {
    ...base,
    dataReady: true,
    currentPrice: Number(latest.close.toFixed(2)),
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePct: Number(priceChangePct.toFixed(2)),
    combos: statuses,
    greenComboCount,
    totalCombos: combos.length,
    anyGreen: greenComboCount > 0,
    asOf: latest.date,
  };
}
