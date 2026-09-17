import Constants from "expo-constants";
import { useSession } from "../store/session";

// Auto-derive the dev machine's LAN IP from Expo's own dev-server host when
// running inside Expo Go on a physical phone (where "localhost" would mean
// the phone itself, not this machine) — falls back to localhost for the
// iOS/Android simulator or web, where localhost does reach this machine.
function resolveBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra?.expoGo?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:4000`;
  }
  return "http://localhost:4000";
}

export const API_BASE_URL = resolveBaseUrl();

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<ApiResult<T>> {
  const token = useSession.getState().accessToken;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.code ? json : { code: "unknown_error", message: json?.message ?? "Something went wrong." } };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Couldn't reach the server. Check your connection." } };
  }
}

export function newIdempotencyKey(): string {
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
