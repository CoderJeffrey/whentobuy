import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

interface Props {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function SidebarItem({ to, label, icon: Icon, end }: Props) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      data-testid="sidebar-item"
      data-nav={to.replace(/^\//, "").toLowerCase()}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
    >
      <Icon size={18} strokeWidth={1.75} />
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}
