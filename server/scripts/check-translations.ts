// Verifies that every key in the English source-of-truth locale has a matching
// key in the Chinese locale (and flags any orphan zh keys). Run before commits
// or in CI: `npm run check-translations`. Exits non-zero on any mismatch.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(here, "../../web/src/i18n/locales");

function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(localesDir, name), "utf8"));
}

const en = load("en.json");
const zh = load("zh.json");

const enKeys = Object.keys(en);
const zhKeys = Object.keys(zh);

const missing = enKeys.filter((k) => !(k in zh));
const orphan = zhKeys.filter((k) => !(k in en));

if (missing.length) {
  console.error(`Missing zh translations (${missing.length}):`);
  for (const k of missing) console.error(`  - ${k}`);
}
if (orphan.length) {
  console.error(`Orphan zh keys not in en (${orphan.length}):`);
  for (const k of orphan) console.error(`  - ${k}`);
}

if (missing.length || orphan.length) {
  process.exit(1);
}

console.log(`✓ translations in sync — ${enKeys.length} keys in en and zh`);
