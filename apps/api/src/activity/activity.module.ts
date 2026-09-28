import { Global, Module } from "@nestjs/common";
import { ActivityController } from "./activity.controller";
import { ActivityNotifier } from "./activity-notifier.service";

// Global: los avisos salen desde auth, athletes, cycles y execution.
@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityNotifier],
  exports: [ActivityNotifier],
})
export class ActivityModule {}
