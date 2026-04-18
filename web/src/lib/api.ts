import type {
  DashboardResponse,
  IndicatorMeta,
  UserConfig,
} from "../types";

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`dashboard fetch failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchIndicators(): Promise<IndicatorMeta[]> {
  const res = await fetch("/api/indicators");
  if (!res.ok) throw new Error(`indicators fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchConfig(): Promise<UserConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
  return res.json();
}

export async function saveConfig(config: UserConfig): Promise<UserConfig> {
  const res = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`config save failed: ${res.status} ${body}`);
  }
  return res.json();
}
