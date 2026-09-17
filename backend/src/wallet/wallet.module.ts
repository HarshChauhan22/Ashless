import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InsightsModule } from "../insights/insights.module";
import { WalletController } from "./wallet.controller";

@Module({
  imports: [AuthModule, InsightsModule],
  controllers: [WalletController],
})
export class WalletModule {}
