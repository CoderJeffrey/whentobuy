import type {
  ApiErrorCode,
  DashboardResponse,
  IndicatorMeta,
  Security,
  UserConfig,
} from "../types";
import { ApiError } from "../types";

async function readError(res: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const message =
    (body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : null) ?? `request failed: ${res.status}`;
  const code: ApiErrorCode =
    body && typeof body === "object" && "code" in body
      ? ((body as { code: ApiErrorCode }).code ?? "INTERNAL")
      : "INTERNAL";
  return new ApiError(message, code, res.status);
}

export async function fetchDashboard(
  ticker: string,
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const res = await fetch(
    `/api/dashboard?ticker=${encodeURIComponent(ticker)}`,
    { signal },
  );
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function fetchIndicators(): Promise<IndicatorMeta[]> {
  const res = await fetch("/api/indicators");
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function fetchConfig(): Promise<UserConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function saveConfig(config: UserConfig): Promise<UserConfig> {
  const res = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function searchSecurities(
  q: string,
  signal?: AbortSignal,
): Promise<Security[]> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q)}&limit=10`,
    { signal },
  );
  if (!res.ok) throw await readError(res);
  return res.json();
}
