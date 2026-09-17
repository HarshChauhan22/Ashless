import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, type CravingSession } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

// The one and only path that resets the smoke-free streak (see
// lib/db.ts computeStreak — it only looks at outcome === 'smoked').
// Included so the CRITICAL STREAK RULE's boundary is actually testable:
// a real relapse must still reset the streak even though cravings,
// breathing, distraction, and redirected payments must not.
export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const { quantity: rawQuantity, trigger } = body as { quantity?: number; trigger?: string };
  const quantity = Number(rawQuantity ?? 1);

  const session: CravingSession = {
    id: newId("craving"),
    userId,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    outcome: "smoked",
    copingAction: "none",
    linkedPaymentId: null,
    intensity: null,
    trigger: trigger ?? null,
  };
  db.cravingSessions.set(session.id, session);

  trackEvent("relapse_logged", { userId, quantity, trigger: trigger ?? null, entryPoint: "craving_intervention" });
  trackEvent("streak_reset", { userId });

  return NextResponse.json({ data: { logged: true } }, { status: 201 });
}
