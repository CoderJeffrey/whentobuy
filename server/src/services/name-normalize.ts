const SUFFIXES: Record<string, string> = {
  INC: "Inc",
  CORP: "Corp",
  LTD: "Ltd",
  LLC: "LLC",
  LP: "LP",
  CO: "Co",
  PLC: "PLC",
  NV: "NV",
  AG: "AG",
  SA: "SA",
};

const ROMAN_NUMERALS = new Set([
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
]);

// Short all-caps tokens that should stay uppercase rather than title-case.
const KNOWN_INITIALISMS = new Set(["JP"]);

function isAlphaNum(c: string): boolean {
  return /[A-Za-z0-9]/.test(c);
}

function normalizeWord(raw: string): string {
  let i = 0;
  while (i < raw.length && !isAlphaNum(raw[i]!)) i++;
  let j = raw.length;
  while (j > i && !isAlphaNum(raw[j - 1]!)) j--;
  if (j <= i) return raw;

  const lead = raw.slice(0, i);
  const trail = raw.slice(j);
  const core = raw.slice(i, j);
  const letters = core.replace(/[^A-Za-z]/g, "").toUpperCase();

  if (letters.length > 0 && letters in SUFFIXES) {
    return lead + SUFFIXES[letters] + trail;
  }
  if (ROMAN_NUMERALS.has(letters)) {
    return lead + letters + trail;
  }
  if (KNOWN_INITIALISMS.has(core)) {
    return lead + core + trail;
  }
  if (letters.length === 1) {
    return lead + core.toUpperCase() + trail;
  }
  const tc = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  return lead + tc + trail;
}

export function normalizeCompanyName(raw: string): string {
  // Strip trailing SEC jurisdiction suffix like " /DE/" or " /CA/"
  const stripped = raw.replace(/\s*\/[A-Z]{2,3}\/\s*$/, "");
  const trimmed = stripped.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.split(" ").map(normalizeWord).join(" ");
}
