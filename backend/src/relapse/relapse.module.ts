import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RelapseController } from "./relapse.controller";

@Module({
  imports: [AuthModule],
  controllers: [RelapseController],
})
export class RelapseModule {}
