import { Global, Module } from "@nestjs/common";
import { EmailHistoryService } from "./email-history.service";

@Global()
@Module({
  providers: [EmailHistoryService],
  exports: [EmailHistoryService],
})
export class EmailHistoryModule {}
