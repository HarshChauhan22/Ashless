import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { GoalsService } from "./goals.service";

@Controller("goals")
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.service.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() body: { title?: string; targetAmountPaise?: number }) {
    return this.service.create(userId, body.title ?? "", body.targetAmountPaise ?? 0);
  }
}
