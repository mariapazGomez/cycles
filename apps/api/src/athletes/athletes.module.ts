import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AthletesController } from "./athletes.controller";
import { AthletesService } from "./athletes.service";
import { TeamsModule } from "../teams/teams.module";

// Relación coach-atleta: invitación, aceptación, listado.
@Module({
  imports: [AuthModule, TeamsModule],
  controllers: [AthletesController],
  providers: [AthletesService],
})
export class AthletesModule {}
