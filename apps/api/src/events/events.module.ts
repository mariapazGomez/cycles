import { Module } from "@nestjs/common";
import { CoachEventsController, EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  controllers: [EventsController, CoachEventsController],
  providers: [EventsService],
})
export class EventsModule {}
