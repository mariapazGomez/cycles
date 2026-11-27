import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { InvitationsService } from "../invitations/invitations.service";
import { AdminService } from "./admin.service";
import { AdminEmail, CloudflareAccessGuard } from "./cloudflare-access.guard";
import { InviteDto } from "./dto/invite.dto";

// La pestaña «Invitaciones» del portal (CYC-295). Ver, enviar, encolar y quitar
// de la cola quedan en el registro de consultas, sin el correo de la persona.
@UseGuards(CloudflareAccessGuard)
@Controller("admin/invitations")
export class AdminInvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly admin: AdminService,
  ) {}

  @Get()
  async list(@AdminEmail() adminEmail: string) {
    await this.admin.log(adminEmail, "invitations");
    return this.invitations.list();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async invite(@AdminEmail() adminEmail: string, @Body() dto: InviteDto) {
    const result = await this.invitations.request(dto.email, adminEmail);
    await this.admin.log(adminEmail, result.state === "queued" ? "invitation-queue" : "invitation-send", result.id);
    return result;
  }

  @Delete(":id/queue")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unqueue(@AdminEmail() adminEmail: string, @Param("id") id: string): Promise<void> {
    await this.invitations.unqueue(id);
    await this.admin.log(adminEmail, "invitation-unqueue", id);
  }
}
