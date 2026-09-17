import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InsightsService } from "../insights/insights.service";

// Goals are a display label on the single underlying ledger, never a
// segregated pool of held money (database-schema.md §3.8) — progress just
// watches the overall wallet balance, capped at the target. Ported from
// webapp/app/api/goals/route.ts. See DECISIONS.md D-012.
@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
  ) {}

  async list(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    const balance = await this.insights.getWalletBalance(userId);
    return goals.map((g) => this.withProgress(g, balance));
  }

  async create(userId: string, title: string, targetAmountPaise: number) {
    if (!title || !title.trim()) {
      throw new BadRequestException({ code: "title_required", message: "Give your goal a name." });
    }
    if (!targetAmountPaise || targetAmountPaise <= 0) {
      throw new BadRequestException({ code: "invalid_target", message: "Target amount must be positive." });
    }
    const goal = await this.prisma.savingsGoal.create({
      data: { userId, title: title.trim(), targetAmountPaise: BigInt(targetAmountPaise) },
    });
    const balance = await this.insights.getWalletBalance(userId);
    return this.withProgress(goal, balance);
  }

  private withProgress(goal: { targetAmountPaise: bigint }, balance: bigint) {
    const progressPaise = balance < goal.targetAmountPaise ? balance : goal.targetAmountPaise;
    const percent = Math.min(100, Math.round((Number(progressPaise) / Number(goal.targetAmountPaise)) * 100));
    return { ...goal, progressPaise, percent };
  }
}
