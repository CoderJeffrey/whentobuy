import type { DashboardResponse } from "../types";

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`dashboard fetch failed: ${res.status} ${body}`);
  }
  return res.json();
}
