import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { InsightsService } from "../insights/insights.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class StreakController {
  constructor(private readonly insights: InsightsService) {}

  @Get("streak")
  async streak(@CurrentUser() userId: string) {
    const { days, sinceIso } = await this.insights.computeStreak(userId);
    return { streakDays: days, streakSince: sinceIso, cigarettesAvoided: await this.insights.countCigarettesAvoided(userId) };
  }

  @Get("progress")
  async progress(@CurrentUser() userId: string) {
    const { days } = await this.insights.computeStreak(userId);
    return {
      streakDays: days,
      longestStreakDays: await this.insights.longestStreakDays(userId),
      cigarettesAvoided: await this.insights.countCigarettesAvoided(userId),
      totalSavedPaise: await this.insights.getWalletBalance(userId),
      byTrigger: await this.insights.avoidedByTrigger(userId),
    };
  }
}
