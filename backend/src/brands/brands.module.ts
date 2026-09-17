import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BrandsController } from "./brands.controller";

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
})
export class BrandsModule {}
