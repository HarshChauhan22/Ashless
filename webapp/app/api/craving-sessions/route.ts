import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, type CravingSession } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

// Created the moment the user taps "I WANT TO SMOKE" (or the direct
// Smoking-Room shortcut) — before any outcome is known. This is what lets
// craving_started/craving_abandoned/craving_resolved all reference the same
// session per docs/product/analytics.md.
export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const entryPoint = (body as { entryPoint?: string }).entryPoint ?? "home_primary_cta";

  const session: CravingSession = {
    id: newId("craving"),
    userId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    outcome: null,
    copingAction: null,
    linkedPaymentId: null,
    intensity: null,
    trigger: null,
  };
  db.cravingSessions.set(session.id, session);
  trackEvent("craving_started", { userId, cravingSessionId: session.id, entryPoint });

  return NextResponse.json({ data: session }, { status: 201 });
}
