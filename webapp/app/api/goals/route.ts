import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, listSavingsGoals, goalProgress, type SavingsGoal } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;
  const goals = listSavingsGoals(userId).map((g) => ({ ...g, ...goalProgress(userId, g) }));
  return NextResponse.json({ data: goals });
}

// Goals are a display label on the single underlying ledger, never a
// segregated pool of held money (PRD §I, database-schema.md §3.8) — creating
// one never moves money or touches the payment/ledger routes.
export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const { title, targetAmountPaise } = body as { title?: string; targetAmountPaise?: number };
  if (!title || !title.trim()) {
    return NextResponse.json({ error: { code: "title_required", message: "Give your goal a name." } }, { status: 400 });
  }
  if (!targetAmountPaise || targetAmountPaise <= 0) {
    return NextResponse.json({ error: { code: "invalid_target", message: "Target amount must be positive." } }, { status: 400 });
  }

  const goal: SavingsGoal = {
    id: newId("goal"),
    userId,
    title: title.trim(),
    targetAmountPaise,
    status: "active",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  db.savingsGoals.set(goal.id, goal);
  trackEvent("savings_goal_created", { userId, goalId: goal.id, targetAmountInr: targetAmountPaise });

  return NextResponse.json({ data: { ...goal, ...goalProgress(userId, goal) } }, { status: 201 });
}
