import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { computeStreak, countCigarettesAvoided } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { days, sinceIso } = computeStreak(userId);
  return NextResponse.json({ data: { streakDays: days, streakSince: sinceIso, cigarettesAvoided: countCigarettesAvoided(userId) } });
}
