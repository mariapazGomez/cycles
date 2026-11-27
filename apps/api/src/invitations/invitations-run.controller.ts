import { Controller, Headers, HttpCode, HttpStatus, NotFoundException, Post, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { createHash, timingSafeEqual } from "crypto";
import { LIMITS } from "../common/throttle/throttle";
import { InvitationsService } from "./invitations.service";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Dispara la cola de invitaciones. Lo llama un programador externo con
// `Authorization: Bearer <INVITATIONS_CRON_SECRET>`; de paso despierta la API.
// Sin el secreto configurado la ruta no existe (404). Solo responde cantidades.
@Controller("internal/invitations")
export class InvitationsRunController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly config: ConfigService,
  ) {}

  @Throttle(LIMITS.tokenUse)
  @Post("run-queue")
  @HttpCode(HttpStatus.OK)
  run(@Headers("authorization") authorization?: string) {
    const secret = this.config.get<string>("INVITATIONS_CRON_SECRET")?.trim();
    if (!secret) throw new NotFoundException();
    const given = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!timingSafeEqual(sha256(given), sha256(secret))) throw new UnauthorizedException();
    return this.invitations.runQueue();
  }
}
