import { Global, Module } from "@nestjs/common";
import { AppStoreConnectClient } from "./app-store-connect.client";
import { TestflightController } from "./testflight.controller";
import { TestflightService } from "./testflight.service";

// Global: el registro (auth) anota la invitación y la verificación del correo la envía.
@Global()
@Module({
  controllers: [TestflightController],
  providers: [AppStoreConnectClient, TestflightService],
  exports: [TestflightService],
})
export class TestflightModule {}
