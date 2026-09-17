import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { computeStreak, countCigarettesAvoided, longestStreakDays, avoidedByTrigger, getWalletBalance } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { days } = computeStreak(userId);
  return NextResponse.json({
    data: {
      streakDays: days,
      longestStreakDays: longestStreakDays(userId),
      cigarettesAvoided: countCigarettesAvoided(userId),
      totalSavedPaise: getWalletBalance(userId),
      byTrigger: avoidedByTrigger(userId),
    },
  });
}
