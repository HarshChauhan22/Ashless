import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { CravingSessionsService } from "./craving-sessions.service";

@Controller("craving-sessions")
@UseGuards(JwtAuthGuard)
export class CravingSessionsController {
  constructor(private readonly service: CravingSessionsService) {}

  @Post()
  create(@CurrentUser() userId: string) {
    return this.service.create(userId);
  }

  @Patch(":id")
  update(@CurrentUser() userId: string, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.service.update(userId, id, body as never);
  }
}
