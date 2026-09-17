import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, type CravingOutcome } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

// CRITICAL STREAK RULE (see docs/project/DECISIONS.md and PRD Immutable
// Rules): only 'smoked' resets the smoke-free streak. 'resisted' (breathing
// or distraction helped), 'simulated_purchase' (redirected via the Digital
// Smoking Room — set by the payment-verify route, not here), and 'abandoned'
// (user backed out) are all streak-neutral. This route enforces that by
// construction: it is never the path that sets outcome to 'simulated_purchase'
// (only /api/payments/[id]/verify does that, after server-side verification),
// so a client can never fake a "redirected" outcome without an actually
// verified payment behind it.
const ALLOWED_OUTCOMES_HERE: CravingOutcome[] = ["resisted", "smoked", "abandoned", "unresolved"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const session = db.cravingSessions.get(params.id);
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: { code: "not_found", message: "Craving session not found." } }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { outcome, copingAction, intensity, trigger } = body as {
    outcome?: CravingOutcome;
    copingAction?: CravingSessionCopingAction;
    intensity?: "mild" | "strong" | "overwhelming";
    trigger?: string;
  };

  if (intensity !== undefined || trigger !== undefined) {
    // Craving Check-In (SCR-10) — both optional, both skippable, "speed over
    // data completeness" per PRD Principle 1. Never blocks progression.
    if (intensity !== undefined) session.intensity = intensity;
    if (trigger !== undefined) session.trigger = trigger || null;
    trackEvent("craving_intensity_logged", { userId, cravingSessionId: session.id, intensity, triggerTag: trigger });
  }

  if (outcome) {
    if (!ALLOWED_OUTCOMES_HERE.includes(outcome)) {
      return NextResponse.json(
        { error: { code: "outcome_not_allowed", message: "This outcome can only be set by a verified event." } },
        { status: 403 }
      );
    }
    session.outcome = outcome;
    session.endedAt = new Date().toISOString();

    if (outcome === "smoked") {
      trackEvent("relapse_logged", { userId, cravingSessionId: session.id });
    } else if (outcome === "resisted") {
      trackEvent("craving_resolved", { userId, cravingSessionId: session.id, interventionType: copingAction ?? session.copingAction });
      trackEvent("craving_handled", { userId, cravingSessionId: session.id, resolution: "resisted" });
    } else if (outcome === "abandoned") {
      trackEvent("craving_abandoned", { userId, cravingSessionId: session.id, interventionType: copingAction ?? session.copingAction });
    }
  }
  if (copingAction) {
    session.copingAction = copingAction;
  }

  db.cravingSessions.set(session.id, session);
  return NextResponse.json({ data: session });
}

type CravingSessionCopingAction = "ai_coach" | "breathing_exercise" | "quick_distraction" | "smoking_room" | "none";
