import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InsightsModule } from "../insights/insights.module";
import { StreakController } from "./streak.controller";

@Module({
  imports: [AuthModule, InsightsModule],
  controllers: [StreakController],
})
export class StreakModule {}
