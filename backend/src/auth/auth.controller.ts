import { Body, Controller, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: { phoneNumber?: string; otp?: string }) {
    return this.auth.login(body.phoneNumber ?? "", body.otp ?? "");
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  completeOnboarding(@CurrentUser() userId: string, @Body() body: Record<string, unknown>) {
    return this.auth.completeOnboarding(userId, body as never);
  }
}
