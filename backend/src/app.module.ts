import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { SmokingProfilesModule } from "./smoking-profiles/smoking-profiles.module";
import { CravingSessionsModule } from "./craving-sessions/craving-sessions.module";
import { PaymentsModule } from "./payments/payments.module";
import { InsightsModule } from "./insights/insights.module";
import { StreakModule } from "./streak/streak.module";
import { WalletModule } from "./wallet/wallet.module";
import { GoalsModule } from "./goals/goals.module";
import { RelapseModule } from "./relapse/relapse.module";
import { BrandsModule } from "./brands/brands.module";
import { AiCoachModule } from "./ai-coach/ai-coach.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SmokingProfilesModule,
    CravingSessionsModule,
    PaymentsModule,
    InsightsModule,
    StreakModule,
    WalletModule,
    GoalsModule,
    RelapseModule,
    BrandsModule,
    AiCoachModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
