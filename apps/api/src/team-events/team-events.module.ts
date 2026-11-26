import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { MyTeamEventsController, TeamEventsController } from "./team-events.controller";
import { TeamEventsService } from "./team-events.service";

// Eventos del equipo (CYC-317).
@Module({
  imports: [EventsModule],
  controllers: [TeamEventsController, MyTeamEventsController],
  providers: [TeamEventsService],
})
export class TeamEventsModule {}
