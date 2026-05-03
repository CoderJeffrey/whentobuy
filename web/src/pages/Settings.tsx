import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { fetchPreferences, savePreferences } from "../lib/api";

type ToastKind = "success" | "error";
interface Toast {
  message: string;
  kind: ToastKind;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] tracking-label uppercase mb-3"
      style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-6"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </section>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
  ariaLabel,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="relative inline-flex shrink-0 transition-colors"
      style={{
        width: "40px",
        height: "22px",
        borderRadius: "999px",
        backgroundColor: on
          ? "color-mix(in srgb, var(--accent) 70%, transparent)"
          : "var(--bg-card-raised)",
        border: `1px solid ${on ? "var(--accent-dim)" : "var(--border-strong)"}`,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "20px" : "2px",
          width: "16px",
          height: "16px",
          borderRadius: "999px",
          backgroundColor: on ? "var(--bg-page)" : "var(--text-secondary)",
          transition: "left 120ms ease, background-color 120ms ease",
        }}
      />
    </button>
  );
}

const NEWSLETTER_CACHE_KEY = "newsletter_enabled_cache_v1";

function readCachedEnabled(): boolean | null {
  try {
    const v = sessionStorage.getItem(NEWSLETTER_CACHE_KEY);
    if (v === "true") return true;
    if (v === "false") return false;
  } catch {
    // sessionStorage may be unavailable
  }
  return null;
}

function writeCachedEnabled(value: boolean): void {
  try {
    sessionStorage.setItem(NEWSLETTER_CACHE_KEY, String(value));
  } catch {
    // ignore
  }
}

function NewsletterToggle({
  setToast,
}: {
  setToast: (t: Toast | null) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(() =>
    readCachedEnabled(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPreferences()
      .then((p) => {
        if (!active) return;
        setEnabled(p.newsletter_enabled);
        writeCachedEnabled(p.newsletter_enabled);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "failed to load");
      });
    return () => {
      active = false;
    };
  }, []);

  const onChange = async (next: boolean) => {
    if (saving) return;
    const prev = enabled;
    setEnabled(next);
    writeCachedEnabled(next);
    setSaving(true);
    try {
      const result = await savePreferences({ newsletter_enabled: next });
      setEnabled(result.newsletter_enabled);
      writeCachedEnabled(result.newsletter_enabled);
      setToast({
        message: result.newsletter_enabled
          ? "Daily emails enabled"
          : "Daily emails turned off",
        kind: "success",
      });
    } catch (err) {
      setEnabled(prev);
      if (prev !== null) writeCachedEnabled(prev);
      setToast({
        message: err instanceof Error ? err.message : "Failed to save",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div
          className="text-sm"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          Daily watchlist email
        </div>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}
        >
          Get a digest of your watchlist scores every day at 8&nbsp;PM&nbsp;ET.
        </p>
        {error && (
          <p
            className="text-xs mt-2"
            style={{ color: "var(--negative)" }}
          >
            {error}
          </p>
        )}
      </div>
      {enabled === null ? (
        <div
          aria-hidden
          style={{
            width: "40px",
            height: "22px",
            borderRadius: "999px",
            backgroundColor: "var(--bg-card-raised)",
            border: "1px solid var(--border-strong)",
            opacity: 0.5,
          }}
        />
      ) : (
        <Toggle
          on={enabled}
          disabled={saving}
          onChange={onChange}
          ariaLabel="Toggle daily watchlist email"
        />
      )}
    </div>
  );
}

function ToastBanner({ toast }: { toast: Toast }) {
  return (
    <div
      className="fixed bottom-6 right-6 px-4 py-3 rounded-lg text-xs"
      style={{
        backgroundColor: "var(--bg-card-raised)",
        border: `1px solid ${
          toast.kind === "error" ? "var(--negative)" : "var(--border-strong)"
        }`,
        color: "var(--text-primary)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 60,
      }}
      role="status"
    >
      {toast.message}
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <PageHeader
        title="Settings"
        description="Manage your account and notifications."
      />

      <div className="flex flex-col gap-4 mt-2">
        <Card>
          <SectionLabel>Notifications</SectionLabel>
          <NewsletterToggle setToast={setToast} />
        </Card>

        <Card>
          <SectionLabel>Account</SectionLabel>
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <div
                className="text-[11px] tracking-label uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                Email
              </div>
              <div
                className="text-sm mt-1 font-mono truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.email ?? "—"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className="flex items-center gap-2 h-9 px-3 rounded-md text-xs transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-card-raised)",
              }}
            >
              <LogOut size={14} strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </Card>
      </div>

      {toast && <ToastBanner toast={toast} />}
    </div>
  );
}
