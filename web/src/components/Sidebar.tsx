import {
  Gauge,
  LayoutDashboard,
  Mail,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarItem } from "./SidebarItem";

export function Sidebar() {
  return (
    <aside
      className="flex flex-col w-[60px] xl:w-[220px] shrink-0 sticky top-0 h-screen py-4 px-2 xl:px-3"
      style={{
        backgroundColor: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
      }}
      data-testid="sidebar"
    >
      <Link
        to="/dashboard"
        className="flex items-center gap-2 h-10 px-2 xl:px-3 mb-6 rounded-md"
        aria-label="IndicatorHub home"
        data-testid="sidebar-logo"
      >
        <span
          className="w-7 h-7 flex items-center justify-center rounded-md shrink-0"
          style={{
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border-strong)",
          }}
          aria-hidden
        >
          <Gauge
            size={16}
            strokeWidth={1.75}
            style={{ color: "var(--accent)" }}
          />
        </span>
        <span
          className="hidden xl:inline text-sm tracking-tight truncate"
          style={{ color: "var(--accent)", fontWeight: 500 }}
        >
          IndicatorHub
        </span>
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        <SidebarItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
        <SidebarItem to="/indicators" label="Indicators" icon={TrendingUp} />
        <SidebarItem to="/mail" label="Mail" icon={Mail} />
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <SidebarItem to="/settings" label="Settings" icon={Settings} />
      </div>
    </aside>
  );
}
