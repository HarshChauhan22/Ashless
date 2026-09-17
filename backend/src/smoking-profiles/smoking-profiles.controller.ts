import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { SmokingProfilesService } from "./smoking-profiles.service";

@Controller("smoking-profiles")
@UseGuards(JwtAuthGuard)
export class SmokingProfilesController {
  constructor(private readonly service: SmokingProfilesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.service.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() body: Record<string, unknown>) {
    return this.service.create(userId, body as never);
  }

  @Patch(":id")
  update(@CurrentUser() userId: string, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.service.update(userId, id, body as never);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.service.remove(userId, id);
  }
}
