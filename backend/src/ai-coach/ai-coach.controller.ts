import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { respondTo } from "./ai-coach.service";

@Controller("ai-coach")
@UseGuards(JwtAuthGuard)
export class AiCoachController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.prisma.aiMessage.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  }

  @Post()
  async send(@CurrentUser() userId: string, @Body() body: { content?: string }) {
    const content = body.content?.trim();
    if (!content) throw new BadRequestException({ code: "content_required", message: "Message can't be empty." });

    await this.prisma.aiMessage.create({ data: { userId, role: "user", content } });
    const replyText = respondTo(content);
    return this.prisma.aiMessage.create({ data: { userId, role: "assistant", content: replyText } });
  }
}
