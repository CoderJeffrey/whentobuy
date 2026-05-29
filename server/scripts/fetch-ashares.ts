import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Eastmoney's stock-list endpoint. We pull only the four core A-share boards;
// the f13 market id is authoritative for the exchange (1 = Shanghai → SS,
// 0 = Shenzhen → SZ). Beijing (BSE) and B-share boards are intentionally
// excluded — Yahoo coverage is poor and they're out of scope.
const BASE = "https://80.push2.eastmoney.com/api/qt/clist/get";
const FS = [
  "m:1+t:2", // Shanghai main board
  "m:1+t:23", // Shanghai STAR market (科创板)
  "m:0+t:6", // Shenzhen main board
  "m:0+t:80", // Shenzhen ChiNext (创业板)
].join(",");

const OUT = resolve("./data/china-ashares.json");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface RawRow {
  f12: string; // ticker code, e.g. "600519"
  f13: number; // market id: 1 = Shanghai, 0 = Shenzhen
  f14: string; // name, e.g. "贵州茅台"
}

interface AShare {
  ticker: string;
  exchange: "SS" | "SZ";
  name: string;
  market: "china";
}

const PAGE_SIZE = 100; // Eastmoney caps rows per request at 100.

async function fetchPage(pn: number): Promise<{ rows: RawRow[]; total: number }> {
  const url =
    `${BASE}?pn=${pn}&pz=${PAGE_SIZE}&po=1&np=1&fid=f12&fs=${FS}&fields=f12,f13,f14`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = (await res.json()) as {
    data?: { diff?: RawRow[]; total?: number };
  };
  return { rows: json.data?.diff ?? [], total: json.data?.total ?? 0 };
}

async function main(): Promise<void> {
  console.log(`[fetch-ashares] paginating ${BASE} (fs=${FS})`);
  const first = await fetchPage(1);
  const total = first.total;
  if (total < 3000) {
    throw new Error(
      `Eastmoney reported only ${total} rows — response format may have changed`,
    );
  }
  const pages = Math.ceil(total / PAGE_SIZE);
  const rows: RawRow[] = [...first.rows];
  for (let pn = 2; pn <= pages; pn++) {
    const { rows: pageRows } = await fetchPage(pn);
    rows.push(...pageRows);
  }
  console.log(`[fetch-ashares] fetched ${rows.length} of ${total} rows`);

  const seen = new Set<string>();
  const ashares: AShare[] = [];
  for (const r of rows) {
    if (!r?.f12 || !r?.f14) continue;
    const ticker = String(r.f12).trim();
    const exchange = r.f13 === 1 ? "SS" : "SZ";
    const key = `${ticker}.${exchange}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ashares.push({ ticker, exchange, name: String(r.f14).trim(), market: "china" });
  }

  ashares.sort((a, b) => a.ticker.localeCompare(b.ticker));

  writeFileSync(OUT, JSON.stringify(ashares, null, 2) + "\n");
  console.log(`[fetch-ashares] wrote ${ashares.length} rows -> ${OUT}`);
}

main().catch((err) => {
  console.error("[fetch-ashares] fatal:", err);
  process.exit(1);
});
