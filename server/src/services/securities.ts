import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../db.js";

export interface Security {
  ticker: string;
  name: string;
  cik: number | null;
}

interface SecEntry {
  ticker: string;
  name: string;
  cik: number;
}

const SEC_PATH = resolve("./data/sec-tickers.json");

// If the securities table has at most this many rows, assume it's the
// legacy S&P 500 seed and replace with the full SEC list.
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

async function readSecList(): Promise<SecEntry[]> {
  const raw = readFileSync(SEC_PATH, "utf8");
  const list = JSON.parse(raw) as unknown;
  if (!Array.isArray(list)) {
    throw new Error(`sec-tickers.json is not an array`);
  }
  return list.map((e) => ({
    ticker: String((e as SecEntry).ticker).toUpperCase(),
    name: String((e as SecEntry).name),
    cik: Number((e as SecEntry).cik),
  }));
}

async function bulkInsert(list: SecEntry[]): Promise<void> {
  const db = await getDb();
  for (const batch of chunk(list, 500)) {
    const values = batch
      .map(
        (s) =>
          `(${sqlLit(s.ticker)}, ${sqlLit(s.name)}, ${
            Number.isFinite(s.cik) ? s.cik : "NULL"
          })`,
      )
      .join(",\n");
    await db.run(
      `INSERT INTO securities (ticker, name, cik) VALUES\n${values}`,
    );
  }
}

/**
 * Ensures the securities table is populated from the SEC list.
 * Replaces existing rows if the table looks empty or still holds the
 * legacy S&P 500 seed.
 */
export async function ensureSecuritiesLoaded(): Promise<void> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    "SELECT COUNT(*) AS c FROM securities",
  );
  const count = Number(reader.getRowObjectsJS()[0]?.c ?? 0);

  let list: SecEntry[];
  try {
    list = await readSecList();
  } catch (err) {
    console.warn(
      `[securities] sec-tickers.json not available at ${SEC_PATH}: ${String(err)}`,
    );
    return;
  }
  if (list.length === 0) return;

  if (count > 0 && count > LEGACY_MAX_ROWS) {
    return;
  }

  if (count > 0) {
    console.log(
      `[securities] replacing ${count} legacy rows with ${list.length} SEC entries`,
    );
    await db.run("DELETE FROM securities");
  } else {
    console.log(`[securities] seeding ${list.length} SEC entries`);
  }

  await bulkInsert(list);
}

export async function getSecurity(ticker: string): Promise<Security | null> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT ticker, name, cik FROM securities WHERE ticker = ${sqlLit(ticker.toUpperCase())}`,
  );
  const rows = reader.getRowObjectsJS();
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    ticker: String(r.ticker),
    name: String(r.name),
    cik: r.cik == null ? null : Number(r.cik),
  };
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
    `SELECT ticker, name, cik FROM securities
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
  return reader.getRowObjectsJS().map((r) => ({
    ticker: String(r.ticker),
    name: String(r.name),
    cik: r.cik == null ? null : Number(r.cik),
  }));
}
