import { LogOut } from "lucide-react";
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
  const { user, signOut } = useAuth();
  if (!user) return null;
  const display = user.name?.trim() || user.email.split("@")[0] || "User";

  return (
    <div
      className="flex flex-col gap-2 rounded-md p-2"
      style={{
        backgroundColor: "var(--bg-subtle)",
        border: "1px solid var(--border)",
      }}
      data-testid="user-menu"
    >
      <div className="flex items-center gap-2 min-w-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] tracking-wider"
            style={{
              backgroundColor: "var(--bg-card-raised)",
              border: "1px solid var(--border-strong)",
              color: "var(--accent)",
              fontWeight: 600,
            }}
            aria-hidden
          >
            {initials(user.name ?? "", user.email)}
          </span>
        )}
        <div className="hidden xl:flex flex-col min-w-0">
          <span
            className="text-xs truncate"
            style={{ color: "var(--text-primary)", fontWeight: 500 }}
          >
            {display}
          </span>
          <span
            className="text-[11px] truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {user.email}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        className="flex items-center gap-2 h-8 px-2 rounded-md text-xs transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Sign out"
      >
        <LogOut size={14} strokeWidth={1.75} />
        <span className="hidden xl:inline">Sign out</span>
      </button>
    </div>
  );
}
