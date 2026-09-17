import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SmokingProfilesService } from "./smoking-profiles.service";
import { SmokingProfilesController } from "./smoking-profiles.controller";

@Module({
  imports: [AuthModule],
  controllers: [SmokingProfilesController],
  providers: [SmokingProfilesService],
  exports: [SmokingProfilesService],
})
export class SmokingProfilesModule {}
