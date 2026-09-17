import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, newId, listSavingsDestinations, type SavingsDestination } from "@/lib/db";

// Mock only — this prototype's payment flow doesn't gate on a destination
// existing (see DECISIONS.md / AGENT_STATUS.md known limitations: no real
// payout leg is simulated). This exists so the Profile screen has something
// real to show/edit, matching PRD §L's requirement that one conceptually
// exists, without pretending to verify a real bank account.
export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;
  return NextResponse.json({ data: listSavingsDestinations(userId) });
}

export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  const { label } = body as { label?: string };
  if (!label || !label.trim()) {
    return NextResponse.json({ error: { code: "label_required", message: "Enter a UPI ID or account label." } }, { status: 400 });
  }

  const existing = listSavingsDestinations(userId);
  const destination: SavingsDestination = {
    id: newId("dest"),
    userId,
    label: label.trim(),
    isDefault: existing.length === 0,
    createdAt: new Date().toISOString(),
  };
  db.savingsDestinations.set(destination.id, destination);
  return NextResponse.json({ data: destination }, { status: 201 });
}
