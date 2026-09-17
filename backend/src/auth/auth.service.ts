import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

// Mock phone+OTP auth, matching the web prototype's lib/auth.ts (code is
// always "123456") — see DECISIONS.md D-012. This is the one piece of the
// real backend that is NOT real yet: real Firebase/SMS OTP needs a Firebase
// project and per-SMS cost the project doesn't have set up. What IS real
// here vs. the web prototype: an actual signed JWT (not a bare userId
// header) and a real Postgres-backed user row.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(phoneNumber: string, otp: string) {
    if (!/^\d{10}$/.test(phoneNumber)) {
      throw new UnauthorizedException("Enter a valid 10-digit phone number.");
    }
    if (otp !== "123456") {
      throw new UnauthorizedException("Incorrect code. Prototype mode — the code is always 123456.");
    }

    const e164 = `+91${phoneNumber}`;
    const user = await this.prisma.user.upsert({
      where: { phoneNumber: e164 },
      update: { phoneVerifiedAt: new Date() },
      create: { phoneNumber: e164, phoneVerifiedAt: new Date() },
    });

    await this.prisma.userSavingsBalance.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, balancePaise: 0n },
    });

    const accessToken = await this.jwt.signAsync({ sub: user.id, phoneNumber: user.phoneNumber });
    return { accessToken, userId: user.id, phoneNumber: user.phoneNumber, onboardingComplete: !!user.onboardingCompletedAt };
  }

  // User Details screen submission — requested addition, 2026-09-16.
  // Setting onboardingCompletedAt here is also what makes the smoke-free
  // streak "start from Day 1" right after this screen (see
  // insights.service.ts's computeStreak, which anchors to this timestamp
  // instead of the account's createdAt when it's set).
  async completeOnboarding(
    userId: string,
    body: { firstName?: string; lastName?: string; email?: string; age?: number; gender?: string },
  ) {
    const { firstName, lastName, email, age, gender } = body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !age || !gender?.trim()) {
      throw new BadRequestException({ code: "details_required", message: "Please fill in every field." });
    }
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      throw new BadRequestException({ code: "invalid_age", message: "Enter a valid age." });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        age,
        gender: gender.trim(),
        onboardingCompletedAt: new Date(),
      },
    });
    return { onboardingComplete: !!user.onboardingCompletedAt };
  }
}
