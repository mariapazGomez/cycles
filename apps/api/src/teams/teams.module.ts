import { Module } from "@nestjs/common";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";
import { TeamCyclesModule } from "../team-cycles/team-cycles.module";

// Equipos del coach (CYC-309).
@Module({
  imports: [TeamCyclesModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
