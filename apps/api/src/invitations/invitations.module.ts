import { Global, Module } from "@nestjs/common";
import { InvitationsRunController } from "./invitations-run.controller";
import { InvitationsService } from "./invitations.service";

// Global: la usan admin (enviar) y auth (registrarse con la invitación).
@Global()
@Module({
  controllers: [InvitationsRunController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
