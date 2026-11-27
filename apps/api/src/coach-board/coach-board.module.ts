import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { CoachBoardController } from "./coach-board.controller";
import { CoachBoardService } from "./coach-board.service";

// Consultas agrupadas del coach (CYC-325).
@Module({
  imports: [EventsModule],
  controllers: [CoachBoardController],
  providers: [CoachBoardService],
})
export class CoachBoardModule {}
