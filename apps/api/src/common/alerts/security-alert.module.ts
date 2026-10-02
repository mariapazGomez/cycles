import { Global, Module } from "@nestjs/common";
import { SecurityAlertService } from "./security-alert.service";

// Global: lo usan el guard de límites, AuthService y MailService.
@Global()
@Module({
  providers: [SecurityAlertService],
  exports: [SecurityAlertService],
})
export class SecurityAlertModule {}
