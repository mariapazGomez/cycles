import { Module } from "@nestjs/common";
import { TeamCyclesController } from "./team-cycles.controller";
import { TeamCyclesService } from "./team-cycles.service";

// Ciclo del equipo (CYC-314).
@Module({
  controllers: [TeamCyclesController],
  providers: [TeamCyclesService],
  exports: [TeamCyclesService],
})
export class TeamCyclesModule {}
