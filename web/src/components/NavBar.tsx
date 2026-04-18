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

export function NavBar({}: {}) {
  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-8">
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
    </header>
  );
}
