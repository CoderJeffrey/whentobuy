import { NavLink } from "react-router-dom";

function linkClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? "px-3 py-1.5 rounded-md text-sm font-semibold"
    : "px-3 py-1.5 rounded-md text-sm";
}

function linkStyle(isActive: boolean): React.CSSProperties {
  return isActive
    ? {
        color: "var(--gold)",
        backgroundColor: "var(--bg-card-hover)",
      }
    : { color: "var(--text-muted)" };
}

export function NavBar({ asOf }: { asOf?: string }) {
  const asOfDate = asOf
    ? new Date(`${asOf}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-8">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--gold)" }}
        >
          Should I Buy Now?
        </h1>
        <nav className="flex items-center gap-1" data-testid="nav">
          <NavLink
            to="/"
            end
            className={linkClass}
            style={({ isActive }) => linkStyle(isActive)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/weights"
            className={linkClass}
            style={({ isActive }) => linkStyle(isActive)}
          >
            Weights
          </NavLink>
        </nav>
      </div>
      {asOfDate && (
        <div
          className="text-sm font-mono"
          style={{ color: "var(--text-muted)" }}
          data-testid="as-of"
        >
          Last updated: {asOfDate}
        </div>
      )}
    </header>
  );
}
