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
      data-nav={label.toLowerCase()}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 h-10 rounded-md pl-3 pr-3 text-sm transition-colors ${
          isActive ? "sidebar-item-active" : "sidebar-item-inactive"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
              style={{ backgroundColor: "var(--accent)" }}
            />
          )}
          <Icon
            size={18}
            strokeWidth={1.75}
            style={{
              color: isActive ? "var(--accent)" : "var(--text-tertiary)",
              flexShrink: 0,
            }}
          />
          <span
            className="truncate xl:inline hidden"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
