import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeCompanyName } from "../src/services/name-normalize.js";

const URL = "https://www.sec.gov/files/company_tickers.json";
const OUT = resolve("./data/sec-tickers.json");
const USER_AGENT =
  process.env.SEC_USER_AGENT ??
  "should-i-buy-now/1.0 (contact@example.com)";

interface RawEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

interface NormalizedEntry {
  ticker: string;
  name: string;
  cik: number;
}

async function main(): Promise<void> {
  console.log(`[fetch-sec-tickers] GET ${URL}`);
  const res = await fetch(URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as Record<string, RawEntry>;
  const entries = Object.values(raw);
  if (entries.length < 5000) {
    throw new Error(
      `parsed only ${entries.length} entries — SEC response format may have changed`,
    );
  }

  const seen = new Set<string>();
  const normalized: NormalizedEntry[] = [];
  for (const e of entries) {
    if (!e?.ticker || !e?.title) continue;
    const ticker = e.ticker.trim().toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    normalized.push({
      ticker,
      name: normalizeCompanyName(e.title),
      cik: Number(e.cik_str),
    });
  }

  normalized.sort((a, b) => a.ticker.localeCompare(b.ticker));

  writeFileSync(OUT, JSON.stringify(normalized, null, 2) + "\n");
  console.log(
    `[fetch-sec-tickers] wrote ${normalized.length} rows -> ${OUT}`,
  );
}

main().catch((err) => {
  console.error("[fetch-sec-tickers] fatal:", err);
  process.exit(1);
});
