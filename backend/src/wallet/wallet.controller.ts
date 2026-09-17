import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { InsightsService } from "../insights/insights.service";

@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  async get(@CurrentUser() userId: string) {
    const [balancePaise, activity, thisMonthPaise, redirectedThisMonth] = await Promise.all([
      this.insights.getWalletBalance(userId),
      this.insights.listWalletActivity(userId),
      this.insights.sumSavedThisMonth(userId),
      this.insights.countRedirectedThisMonth(userId),
    ]);
    return { balancePaise, activity, thisMonthPaise, redirectedThisMonth };
  }
}
