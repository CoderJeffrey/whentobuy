// Smoke-test: build an EvalContext from synthetic prices and run every
// registered indicator evaluator, asserting nothing throws and the result
// shape is well-formed. Also prints the triggered counts so you can sanity-
// check vs intuition.
import { buildEvalContext } from "../src/eval-context.js";
import { INDICATOR_REGISTRY } from "../src/indicator-registry.js";
import type { PriceRow } from "../src/types.js";

function generatePrices(n = 400): PriceRow[] {
  const out: PriceRow[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const trend = Math.sin(i / 30) * 5;
    const noise = (Math.random() - 0.5) * 1.5;
    price = Math.max(1, price + trend * 0.05 + noise);
    const open = price + (Math.random() - 0.5) * 0.5;
    const close = price;
    const high = Math.max(open, close) + Math.random() * 0.6;
    const low = Math.min(open, close) - Math.random() * 0.6;
    const volume = Math.round(1_000_000 * (0.7 + Math.random() * 0.6));
    out.push({
      date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return out;
}

const prices = generatePrices();
const ctx = buildEvalContext(prices);

let triggered = 0;
let total = 0;
const errors: string[] = [];
for (const def of Object.values(INDICATOR_REGISTRY)) {
  total++;
  try {
    const r = def.evaluate(ctx);
    if (typeof r.triggered !== "boolean" || typeof r.displayValue !== "string") {
      errors.push(`${def.id}: malformed result ${JSON.stringify(r)}`);
      continue;
    }
    if (r.triggered) triggered++;
  } catch (e) {
    errors.push(`${def.id}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(`registered: ${total}`);
console.log(`triggered:  ${triggered}`);
if (errors.length) {
  console.log(`errors (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
} else {
  console.log("all evaluators clean");
}
