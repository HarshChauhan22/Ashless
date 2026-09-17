import { Body, Controller, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: Record<string, unknown>) {
    return this.service.create(userId, idempotencyKey ?? null, body as never);
  }

  @Post(":id/verify")
  verify(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.service.verify(userId, id);
  }
}
