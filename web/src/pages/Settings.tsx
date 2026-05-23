import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteAccount,
  fetchPreferences,
  savePreferences,
  type UserPreferences,
} from "../lib/api";
import "./Settings.css";

type ToastKind = "success" | "error";
interface Toast {
  message: string;
  kind: ToastKind;
}

/** Short zone name, e.g. "EDT", "PST", "GMT+9". */
function zoneAbbrev(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Human label, e.g. "America / New_York · EDT". */
function zoneLabel(tz: string): string {
  const pretty = tz.replace("/", " / ");
  const abbr = zoneAbbrev(tz);
  return abbr ? `${pretty} · ${abbr}` : pretty;
}

const FALLBACK_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

function supportedZones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    const all = intl.supportedValuesOf?.("timeZone");
    if (all && all.length) return all;
  } catch {
    // fall through
  }
  return FALLBACK_ZONES;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [savingTz, setSavingTz] = useState(false);
  const [editingTz, setEditingTz] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentTz = prefs?.time_zone;
  const zones = useMemo(() => {
    const list = supportedZones();
    if (currentTz && !list.includes(currentTz)) {
      return [currentTz, ...list];
    }
    return list;
  }, [currentTz]);

  useEffect(() => {
    let active = true;
    fetchPreferences()
      .then((p) => {
        if (active) setPrefs(p);
      })
      .catch((err) => {
        if (active)
          setLoadError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const newsletterOn = prefs?.newsletter_enabled ?? false;

  async function toggleNewsletter() {
    if (!prefs || savingNewsletter) return;
    const next = !prefs.newsletter_enabled;
    const prev = prefs;
    setPrefs({ ...prefs, newsletter_enabled: next });
    setSavingNewsletter(true);
    try {
      const result = await savePreferences({ newsletter_enabled: next });
      setPrefs(result);
      setToast({
        message: result.newsletter_enabled
          ? "Daily emails enabled"
          : "Daily emails turned off",
        kind: "success",
      });
    } catch (err) {
      setPrefs(prev);
      setToast({
        message: err instanceof Error ? err.message : "Failed to save",
        kind: "error",
      });
    } finally {
      setSavingNewsletter(false);
    }
  }

  async function changeTimeZone(tz: string) {
    if (!prefs || tz === prefs.time_zone) {
      setEditingTz(false);
      return;
    }
    const prev = prefs;
    setPrefs({ ...prefs, time_zone: tz });
    setEditingTz(false);
    setSavingTz(true);
    try {
      const result = await savePreferences({ time_zone: tz });
      setPrefs(result);
      setToast({ message: `Time zone set to ${tz}`, kind: "success" });
    } catch (err) {
      setPrefs(prev);
      setToast({
        message: err instanceof Error ? err.message : "Failed to save",
        kind: "error",
      });
    } finally {
      setSavingTz(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      navigate("/", { replace: true });
    } catch (err) {
      setConfirmDelete(false);
      setDeleting(false);
      setToast({
        message: err instanceof Error ? err.message : "Failed to delete account",
        kind: "error",
      });
    }
  }

  return (
    <div className="sbg">
      <div className="bg-grid" />

      <main className="main">
        <header className="page-head">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your account and notifications.</p>
        </header>

        {/* Notifications */}
        <section className="card">
          <div className="card-head">
            <span className="card-title">Notifications</span>
          </div>
          <div className="row">
            <div className="row-body">
              <div className="row-label">Daily watchlist email</div>
              <div className="row-desc">
                Get a digest of your watchlist scores every day at 8&nbsp;PM&nbsp;ET.
              </div>
              {loadError && <div className="row-error">{loadError}</div>}
            </div>
            <div className="row-control">
              {prefs === null ? (
                <span className="toggle skeleton" aria-hidden />
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={newsletterOn}
                  aria-label="Toggle daily watchlist email"
                  disabled={savingNewsletter}
                  className={`toggle${newsletterOn ? " on" : ""}`}
                  onClick={() => void toggleNewsletter()}
                />
              )}
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="card">
          <div className="card-head">
            <span className="card-title">Account</span>
          </div>

          <div className="row">
            <div className="row-body">
              <div className="field-static">
                <span className="lbl">Email</span>
                <span className="val">{user?.email ?? "—"}</span>
              </div>
            </div>
            <div className="row-control">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void signOut()}
              >
                <LogOut strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </div>

          <div className="row">
            <div className="row-body">
              <div className="field-static">
                <span className="lbl">Time zone</span>
                <span className="val">
                  {prefs ? zoneLabel(prefs.time_zone) : "—"}
                </span>
              </div>
            </div>
            <div className="row-control">
              {editingTz && prefs ? (
                <div className="tz-edit">
                  <select
                    className="tz-select"
                    autoFocus
                    value={prefs.time_zone}
                    disabled={savingTz}
                    onChange={(e) => void changeTimeZone(e.target.value)}
                  >
                    {zones.map((tz) => (
                      <option key={tz} value={tz}>
                        {zoneLabel(tz)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="tz-cancel"
                    onClick={() => setEditingTz(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!prefs || savingTz}
                  onClick={() => setEditingTz(true)}
                >
                  CHANGE
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="card danger-card">
          <div className="card-head">
            <span className="card-title">Danger zone</span>
          </div>
          <div className="row">
            <div className="row-body">
              <div className="row-label">Delete account</div>
              <div className="row-desc">
                Permanently remove your account, watchlists, and alert rules.
                This cannot be undone.
              </div>
            </div>
            <div className="row-control">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmDelete(true)}
              >
                DELETE ACCOUNT
              </button>
            </div>
          </div>
        </section>
      </main>

      {confirmDelete && (
        <div
          className="modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm account deletion"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete your account?</h2>
            <p className="modal-text">
              This permanently removes <strong>{user?.email ?? "your account"}</strong>{" "}
              along with your watchlists, combos, and alert rules. This action
              cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "DELETING…" : "DELETE ACCOUNT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`toast${toast.kind === "error" ? " error" : ""}`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
