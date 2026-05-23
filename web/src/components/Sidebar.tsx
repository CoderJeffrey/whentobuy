import { LayoutDashboard, Settings, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarItem } from "./SidebarItem";
import { UserMenu } from "./UserMenu";
import "./Sidebar.css";

export function Sidebar() {
  return (
    <aside className="ihsb" data-testid="sidebar">
      <Link
        to="/"
        className="brand"
        aria-label="IndicatorHub home"
        data-testid="sidebar-logo"
      >
        <span className="brand-mark" aria-hidden>
          ⌁
        </span>
        <span className="brand-name">IndicatorHub</span>
      </Link>

      <div className="nav-section">
        <div className="label">Workspace</div>
        <nav
          className="nav-section"
          style={{ gap: 2 }}
          aria-label="Primary"
        >
          <SidebarItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <SidebarItem to="/indicators" label="Indicators" icon={TrendingUp} />
        </nav>
      </div>

      <div className="spacer" />

      <UserMenu />
      <SidebarItem to="/settings" label="Settings" icon={Settings} />
    </aside>
  );
}
