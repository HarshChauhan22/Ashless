import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Ported from webapp/lib/db.ts's helper functions — the streak/progress/
// wallet-stats queries shared across several controllers. See DECISIONS.md
// D-012. `computeStreak` only ever looks at outcome === 'smoked' — this is
// the CRITICAL STREAK RULE, now enforced by a real query against Postgres
// instead of an in-memory filter, but the same rule.
@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeStreak(userId: string): Promise<{ days: number; sinceIso: string }> {
    const lastRelapse = await this.prisma.cravingSession.findFirst({
      where: { userId, outcome: "smoked" },
      orderBy: { startedAt: "desc" },
    });
    // Anchors to onboardingCompletedAt (the User Details screen) when set,
    // so the tracker genuinely starts from Day 1 right after onboarding —
    // requested 2026-09-16 — falling back to createdAt for users who never
    // completed that screen.
    const user = (await this.prisma.user.findUnique({ where: { id: userId } }))!;
    const since = lastRelapse ? lastRelapse.startedAt : (user.onboardingCompletedAt ?? user.createdAt);
    const days = Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
    return { days, sinceIso: since.toISOString() };
  }

  async countCigarettesAvoided(userId: string): Promise<number> {
    return this.prisma.cravingSession.count({
      where: { userId, outcome: { in: ["resisted", "simulated_purchase"] } },
    });
  }

  async avoidedByTrigger(userId: string): Promise<{ trigger: string; count: number }[]> {
    const rows = await this.prisma.cravingSession.findMany({
      where: { userId, outcome: { in: ["resisted", "simulated_purchase"] } },
      select: { trigger: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.trigger ?? "not specified";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count);
  }

  async longestStreakDays(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 0;
    const relapses = await this.prisma.cravingSession.findMany({
      where: { userId, outcome: "smoked" },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true },
    });
    const boundaries = [user.onboardingCompletedAt ?? user.createdAt, ...relapses.map((r) => r.startedAt), new Date()];
    let longest = 0;
    for (let i = 0; i < boundaries.length - 1; i++) {
      const days = Math.floor((boundaries[i + 1].getTime() - boundaries[i].getTime()) / (1000 * 60 * 60 * 24));
      longest = Math.max(longest, days);
    }
    return longest;
  }

  async getWalletBalance(userId: string): Promise<bigint> {
    const row = await this.prisma.userSavingsBalance.findUnique({ where: { userId } });
    return row?.balancePaise ?? 0n;
  }

  async sumSavedThisMonth(userId: string): Promise<bigint> {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const rows = await this.prisma.savingsTransaction.findMany({
      where: { userId, entryType: "credit", createdAt: { gte: monthStart } },
      select: { amountPaise: true },
    });
    return rows.reduce((sum, r) => sum + r.amountPaise, 0n);
  }

  async countRedirectedThisMonth(userId: string): Promise<number> {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return this.prisma.cravingSession.count({
      where: { userId, outcome: "simulated_purchase", startedAt: { gte: monthStart } },
    });
  }

  async listWalletActivity(userId: string, limit = 10) {
    const [credits, relapses] = await Promise.all([
      this.prisma.savingsTransaction.findMany({
        where: { userId, entryType: "credit" },
        select: { id: true, amountPaise: true, createdAt: true },
      }),
      this.prisma.cravingSession.findMany({
        where: { userId, outcome: "smoked" },
        select: { id: true, startedAt: true },
      }),
    ]);
    const merged = [
      ...credits.map((c) => ({ id: c.id, kind: "redirected" as const, amountPaise: c.amountPaise, createdAt: c.createdAt })),
      ...relapses.map((r) => ({ id: r.id, kind: "relapse" as const, createdAt: r.startedAt })),
    ];
    return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }
}
