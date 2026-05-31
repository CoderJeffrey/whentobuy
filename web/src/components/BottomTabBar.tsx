import { LayoutDashboard, Settings, Star, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./BottomTabBar.css";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Mobile-only bottom navigation (hidden at ≥768px via CSS). Mail is demoted —
 * email preferences live under Settings (Notifications), so it gets no tab slot.
 * `NavLink` lights `/dashboard` for `/dashboard/:symbol` too (descendant match).
 */
export function BottomTabBar() {
  const { t } = useTranslation();

  const tabs: Tab[] = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/watchlist", label: t("nav.watchlist"), icon: Star },
    { to: "/indicators", label: t("nav.indicators"), icon: TrendingUp },
    { to: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav className="btab" aria-label="Primary" data-testid="bottom-tabs">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `btab-item${isActive ? " active" : ""}`}
          data-testid="bottom-tab"
          data-nav={to.replace(/^\//, "")}
        >
          <Icon size={22} strokeWidth={1.75} aria-hidden />
          <span className="btab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
