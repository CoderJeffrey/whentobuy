import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as cheerio from "cheerio";

const URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies";
const OUT = resolve("./data/sp500.json");

interface Security {
  ticker: string;
  name: string;
  sector: string;
}

async function main(): Promise<void> {
  console.log(`[scrape-sp500] fetching ${URL}`);
  const res = await fetch(URL, {
    headers: { "User-Agent": "should-i-buy-now-scraper/1.0" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const table = $("table.wikitable").first();
  if (table.length === 0) throw new Error("could not find constituents table");

  const securities: Security[] = [];
  table.find("tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 4) return;
    const ticker = $(cells[0]).text().trim().replace(/\s+/g, "");
    const name = $(cells[1]).text().trim();
    const sector = $(cells[2]).text().trim();
    if (!ticker || !name) return;
    securities.push({ ticker, name, sector });
  });

  if (securities.length < 400) {
    throw new Error(
      `parsed only ${securities.length} rows — table format may have changed`,
    );
  }

  securities.sort((a, b) => a.ticker.localeCompare(b.ticker));

  writeFileSync(OUT, JSON.stringify(securities, null, 2) + "\n");
  console.log(`[scrape-sp500] wrote ${securities.length} rows -> ${OUT}`);
}

main().catch((err) => {
  console.error("[scrape-sp500] fatal:", err);
  process.exit(1);
});
