import { Module } from "@nestjs/common";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

// Equipos del coach (CYC-309).
@Module({
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
