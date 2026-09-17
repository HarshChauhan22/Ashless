import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AiCoachController } from "./ai-coach.controller";

@Module({
  imports: [AuthModule],
  controllers: [AiCoachController],
})
export class AiCoachModule {}
