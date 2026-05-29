import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

function initials(name: string, email: string): string {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  if (!user) return null;
  const display = user.name?.trim() || user.email.split("@")[0] || "User";

  return (
    <div data-testid="user-menu">
      <div className="user-card">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="user-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="user-avatar" aria-hidden>
            {initials(user.name ?? "", user.email)}
          </span>
        )}
        <div className="user-info">
          <div className="user-name">{display}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        className="nav-item"
        aria-label={t("common.signOut")}
      >
        <LogOut size={18} strokeWidth={1.75} />
        <span className="nav-label">{t("common.signOut")}</span>
      </button>
    </div>
  );
}
