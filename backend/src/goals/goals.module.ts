import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InsightsModule } from "../insights/insights.module";
import { GoalsService } from "./goals.service";
import { GoalsController } from "./goals.controller";

@Module({
  imports: [AuthModule, InsightsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
