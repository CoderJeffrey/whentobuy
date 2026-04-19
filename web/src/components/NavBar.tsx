function formatLastUpdated(asOf: string | undefined): string {
  if (!asOf) return "—";
  const d = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return asOf;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NavBar({ asOf }: { asOf?: string }) {
  return (
    <header className="flex items-center justify-between py-5">
      <h1
        className="text-lg font-semibold tracking-tight"
        style={{ color: "var(--gold)" }}
      >
        Should I Buy Now?
      </h1>
      <div
        className="text-xs font-mono"
        style={{ color: "var(--text-muted)" }}
        data-testid="last-updated"
      >
        Last updated: {formatLastUpdated(asOf)}
      </div>
    </header>
  );
}
