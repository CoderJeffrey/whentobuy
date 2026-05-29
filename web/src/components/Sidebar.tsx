import { LayoutDashboard, Settings, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarItem } from "./SidebarItem";
import { UserMenu } from "./UserMenu";
import "./Sidebar.css";

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="ihsb" data-testid="sidebar">
      <Link
        to="/"
        className="brand"
        aria-label={t("nav.home")}
        data-testid="sidebar-logo"
      >
        <span className="brand-mark" aria-hidden>
          ⌁
        </span>
        <span className="brand-name">IndicatorHub</span>
      </Link>

      <div className="nav-section">
        <div className="label">{t("nav.workspace")}</div>
        <nav
          className="nav-section"
          style={{ gap: 2 }}
          aria-label="Primary"
        >
          <SidebarItem to="/dashboard" label={t("nav.dashboard")} icon={LayoutDashboard} />
          <SidebarItem to="/indicators" label={t("nav.indicators")} icon={TrendingUp} />
        </nav>
      </div>

      <div className="spacer" />

      <UserMenu />
      <SidebarItem to="/settings" label={t("nav.settings")} icon={Settings} />
    </aside>
  );
}
