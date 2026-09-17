import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CravingSessionsService } from "./craving-sessions.service";
import { CravingSessionsController } from "./craving-sessions.controller";

@Module({
  imports: [AuthModule],
  controllers: [CravingSessionsController],
  providers: [CravingSessionsService],
  exports: [CravingSessionsService],
})
export class CravingSessionsModule {}
