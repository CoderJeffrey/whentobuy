import { SearchBar } from "./SearchBar";

function formatLastUpdated(asOf: string | undefined): string {
  if (!asOf) return "—";
  const d = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return asOf;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NavBar({ asOf }: { asOf?: string }) {
  return (
    <header className="flex items-center gap-4 py-6">
      <div className="flex-1 flex">
        <SearchBar />
      </div>
      <div
        className="text-[11px] font-mono whitespace-nowrap"
        style={{ color: "var(--text-tertiary)" }}
        data-testid="last-updated"
      >
        Last updated: {formatLastUpdated(asOf)}
      </div>
    </header>
  );
}
