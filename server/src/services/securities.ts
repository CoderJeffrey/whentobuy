import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../db.js";

export interface Security {
  ticker: string;
  name: string;
  sector: string | null;
}

const SP500_PATH = resolve("./data/sp500.json");

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

export async function loadSp500IfEmpty(): Promise<void> {
  const db = await getDb();
  const reader = await db.runAndReadAll("SELECT COUNT(*) AS c FROM securities");
  const rows = reader.getRowObjectsJS();
  const count = Number(rows[0]?.c ?? 0);
  if (count > 0) return;

  let raw: string;
  try {
    raw = readFileSync(SP500_PATH, "utf8");
  } catch (err) {
    console.warn(
      `[securities] sp500.json not found at ${SP500_PATH}: ${String(err)}`,
    );
    return;
  }

  const list = JSON.parse(raw) as Array<{
    ticker: string;
    name: string;
    sector?: string;
  }>;
  if (!Array.isArray(list) || list.length === 0) return;

  const values = list
    .map(
      (s) =>
        `(${sqlLit(s.ticker.toUpperCase())}, ${sqlLit(s.name)}, ${
          s.sector ? sqlLit(s.sector) : "NULL"
        }, TRUE)`,
    )
    .join(",\n");

  await db.run(
    `INSERT INTO securities (ticker, name, sector, is_sp500) VALUES\n${values}`,
  );
  console.log(`[securities] seeded ${list.length} S&P 500 rows`);
}

export async function getSecurity(ticker: string): Promise<Security | null> {
  const db = await getDb();
  const reader = await db.runAndReadAll(
    `SELECT ticker, name, sector FROM securities WHERE ticker = ${sqlLit(ticker.toUpperCase())}`,
  );
  const rows = reader.getRowObjectsJS();
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    ticker: String(r.ticker),
    name: String(r.name),
    sector: r.sector == null ? null : String(r.sector),
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
  const reader = await db.runAndReadAll(
    `SELECT ticker, name, sector FROM securities
     WHERE lower(ticker) LIKE ${lit} || '%'
        OR lower(name) LIKE '%' || ${lit} || '%'
     ORDER BY
       CASE WHEN lower(ticker) = ${lit} THEN 0
            WHEN lower(ticker) LIKE ${lit} || '%' THEN 1
            ELSE 2 END,
       ticker
     LIMIT ${Math.max(1, Math.min(50, Math.floor(limit)))}`,
  );
  return reader.getRowObjectsJS().map((r) => ({
    ticker: String(r.ticker),
    name: String(r.name),
    sector: r.sector == null ? null : String(r.sector),
  }));
}
