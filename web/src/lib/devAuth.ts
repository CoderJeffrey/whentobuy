const STORAGE_KEY = "whentobuy:devAutoLogin";

export const DEV_BYPASS_AVAILABLE =
  import.meta.env.DEV &&
  (import.meta.env.VITE_DEV_AUTO_LOGIN as string | undefined) === "true";

export const DEV_USER_ID =
  (import.meta.env.VITE_DEV_USER_ID as string | undefined) ??
  "00000000-0000-0000-0000-000000000001";

export const DEV_USER_EMAIL =
  (import.meta.env.VITE_DEV_USER_EMAIL as string | undefined) ??
  "dev@local.test";

function readOverride(): "on" | "off" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export function isDevBypassActive(): boolean {
  if (!DEV_BYPASS_AVAILABLE) return false;
  return readOverride() !== "off";
}

export function setDevBypass(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // ignore storage errors (private mode, quota)
  }
}

export function clearDevBypassOverride(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
