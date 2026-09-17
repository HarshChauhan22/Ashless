"use client";

import { useSession } from "@/store/session";

// Thin fetch wrapper. Every mutating call gets an Idempotency-Key when the
// caller supplies one (api-spec.md §1's Idempotency-Key header contract) —
// the payment-creation call always does. This file only ever *sends* data;
// it never computes a financial amount — that stays server-side per the
// IMPORTANT FINANCIAL RULE in the brief.
export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; idempotencyKey?: string } = {}
): Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message: string }; status: number }> {
  const userId = useSession.getState().userId;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error ?? { code: "unknown", message: "Something went wrong." }, status: res.status };
  }
  return { ok: true, data: json.data as T };
}

export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Client-originated UX event (screen views, taps) — never used to drive
 * money/ledger/streak logic, matching system-architecture.md §10.1. */
export function track(eventName: string, properties: Record<string, unknown> = {}) {
  void apiFetch("/api/analytics", { method: "POST", body: { eventName, properties } });
}
