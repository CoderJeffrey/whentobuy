import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeCompanyName } from "./name-normalize.js";

const CASES: Array<[string, string]> = [
  ["MICROSOFT CORP", "Microsoft Corp"],
  ["BERKSHIRE HATHAWAY INC", "Berkshire Hathaway Inc"],
  ["JP MORGAN CHASE & CO", "JP Morgan Chase & Co"],
  ["TESLA, INC.", "Tesla, Inc."],
  ["  MICROSOFT  CORP  ", "Microsoft Corp"],
  ["ALPHABET INC CLASS A", "Alphabet Inc Class A"],
  ["3M CO", "3M Co"],
  ["BROOKFIELD ASSET MANAGEMENT LTD", "Brookfield Asset Management Ltd"],
  [
    "MORGAN STANLEY DIRECT LENDING FUND II",
    "Morgan Stanley Direct Lending Fund II",
  ],
  ["APPLE INC.", "Apple Inc."],
  ["BANK OF AMERICA CORP /DE/", "Bank Of America Corp"],
  ["HEWLETT PACKARD CO /DE/", "Hewlett Packard Co"],
];

for (const [input, expected] of CASES) {
  test(`normalizes "${input}"`, () => {
    assert.equal(normalizeCompanyName(input), expected);
  });
}
