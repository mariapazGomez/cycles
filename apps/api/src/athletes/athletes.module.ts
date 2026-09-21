import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AthletesController } from "./athletes.controller";
import { AthletesService } from "./athletes.service";

// Relación coach-atleta: invitación, aceptación, listado.
@Module({
  imports: [AuthModule],
  controllers: [AthletesController],
  providers: [AthletesService],
})
export class AthletesModule {}
