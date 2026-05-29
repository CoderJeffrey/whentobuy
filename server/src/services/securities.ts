import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../db.js";

export interface Security {
  ticker: string;
  exchange: string;
  name: string;
  market: string;
  cik: number | null;
}

interface SecEntry {
  ticker: string;
  exchange: string;
  name: string;
  market: string;
  cik: number | null;
}

const SEC_PATH = resolve("./data/sec-tickers.json");
const ASHARES_PATH = resolve("./data/china-ashares.json");

// If the US securities set has at most this many rows, assume it's the legacy
// S&P 500 seed and replace with the full SEC list.
const LEGACY_MAX_ROWS = 1000;

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function readSecList(): SecEntry[] {
  const list = JSON.parse(readFileSync(SEC_PATH, "utf8")) as unknown;
  if (!Array.isArray(list)) throw new Error("sec-tickers.json is not an array");
  return list.map((e) => {
    const r = e as { ticker: unknown; name: unknown; cik: unknown };
    return {
      ticker: String(r.ticker).toUpperCase(),
      exchange: "US",
      name: String(r.name),
      market: "us",
      cik: Number.isFinite(Number(r.cik)) ? Number(r.cik) : null,
    };
  });
}

function readAShareList(): SecEntry[] {
  const list = JSON.parse(readFileSync(ASHARES_PATH, "utf8")) as unknown;
  if (!Array.isArray(list))
    throw new Error("china-ashares.json is not an array");
  return list.map((e) => {
    const r = e as { ticker: unknown; exchange: unknown; name: unknown };
    return {
      ticker: String(r.ticker).toUpperCase(),
      exchange: String(r.exchange).toUpperCase(),
      name: String(r.name),
      market: "china",
      cik: null,
    };
  });
}

async function bulkInsert(list: SecEntry[]): Promise<void> {
  const db = await getDb();
  for (const batch of chunk(list, 500)) {
    const values = batch
      .map(
        (s) =>
          `(${sqlLit(s.ticker)}, ${sqlLit(s.exchange)}, ${sqlLit(s.name)}, ${sqlLit(s.market)}, ${
            s.cik != null && Number.isFinite(s.cik) ? s.cik : "NULL"
          })`,
      )
      .join(",\n");
    await db.run(
      `INSERT INTO securities (ticker, exchange, name, market, cik) VALUES\n${values}`,
    );
  }
}

async function countMarket(market: string): Promise<number> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT COUNT(*) AS c FROM securities WHERE market = ${sqlLit(market)}`,
  );
  return Number(reader.getRowObjectsJS()[0]?.c ?? 0);
}

/**
 * Populate the securities table with the unified US + China universe.
 * US rows come from the SEC list (replacing a legacy S&P 500 seed if present);
 * China A-shares come from the committed Eastmoney scrape.
 */
export async function ensureSecuritiesLoaded(): Promise<void> {
  const db = await getDb();

  // US (SEC) rows.
  try {
    const usList = readSecList();
    if (usList.length > 0) {
      const usCount = await countMarket("us");
      if (usCount === 0) {
        console.log(`[securities] seeding ${usList.length} SEC (US) entries`);
        await bulkInsert(usList);
      } else if (usCount <= LEGACY_MAX_ROWS) {
        console.log(
          `[securities] replacing ${usCount} legacy US rows with ${usList.length} SEC entries`,
        );
        await db.run("DELETE FROM securities WHERE market = 'us'");
        await bulkInsert(usList);
      }
    }
  } catch (err) {
    console.warn(`[securities] SEC list unavailable: ${String(err)}`);
  }

  // China A-share rows.
  try {
    const cnCount = await countMarket("china");
    if (cnCount === 0) {
      const cnList = readAShareList();
      if (cnList.length > 0) {
        console.log(`[securities] seeding ${cnList.length} China A-shares`);
        await bulkInsert(cnList);
      }
    }
  } catch (err) {
    console.warn(`[securities] A-share list unavailable: ${String(err)}`);
  }
}

function mapRow(r: Record<string, unknown>): Security {
  return {
    ticker: String(r.ticker),
    exchange: String(r.exchange),
    name: String(r.name),
    market: String(r.market),
    cik: r.cik == null ? null : Number(r.cik),
  };
}

export async function getSecurity(
  ticker: string,
  exchange: string,
): Promise<Security | null> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT ticker, exchange, name, market, cik FROM securities
     WHERE ticker = ${sqlLit(ticker.toUpperCase())}
       AND exchange = ${sqlLit(exchange.toUpperCase())}`,
  );
  const rows = reader.getRowObjectsJS();
  return rows.length === 0 ? null : mapRow(rows[0]!);
}

export async function searchSecurities(
  q: string,
  limit = 10,
): Promise<Security[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const db = await getDb();
  const lit = sqlLit(trimmed.toLowerCase());
  const cappedLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const reader = await db.runAndReadAll(
    `SELECT ticker, exchange, name, market, cik FROM securities
     WHERE lower(ticker) LIKE ${lit} || '%'
        OR lower(name) LIKE '%' || ${lit} || '%'
     ORDER BY
       CASE
         WHEN lower(ticker) = ${lit}           THEN 0
         WHEN lower(ticker) LIKE ${lit} || '%' THEN 1
         WHEN lower(name)   LIKE ${lit} || '%' THEN 2
         ELSE 3
       END,
       length(ticker),
       length(name),
       ticker
     LIMIT ${cappedLimit}`,
  );
  return reader.getRowObjectsJS().map(mapRow);
}
