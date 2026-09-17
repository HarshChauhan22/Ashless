import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

// The one and only path that resets the smoke-free streak (see
// insights.service.ts's computeStreak — it only looks at outcome ===
// 'smoked'). Ported from webapp/app/api/relapse/route.ts. See
// DECISIONS.md D-012.
@Controller("relapse")
@UseGuards(JwtAuthGuard)
export class RelapseController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async log(@CurrentUser() userId: string, @Body() body: { trigger?: string }) {
    await this.prisma.cravingSession.create({
      data: { userId, outcome: "smoked", copingAction: "none", endedAt: new Date(), trigger: body.trigger ?? null },
    });
    return { logged: true };
  }
}
