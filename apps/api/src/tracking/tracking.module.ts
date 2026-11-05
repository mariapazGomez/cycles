import { Module } from "@nestjs/common";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";
import { SummaryLayoutService } from "./summary-layout.service";

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, SummaryLayoutService],
})
export class TrackingModule {}
