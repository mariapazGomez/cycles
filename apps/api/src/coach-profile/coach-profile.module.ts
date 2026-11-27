import { Global, Module } from "@nestjs/common";
import { CoachProfileController } from "./coach-profile.controller";
import { CoachProfileService } from "./coach-profile.service";

// Global: la usan el registro, «mi cuenta» y admin.
@Global()
@Module({
  controllers: [CoachProfileController],
  providers: [CoachProfileService],
  exports: [CoachProfileService],
})
export class CoachProfileModule {}
