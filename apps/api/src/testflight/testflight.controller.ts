import { Controller, Headers, HttpCode, HttpStatus, NotFoundException, Post, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { createHash, timingSafeEqual } from "crypto";
import { LIMITS } from "../common/throttle/throttle";
import { TestflightService } from "./testflight.service";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Reintenta las invitaciones pendientes o fallidas. Mismo secreto que el resumen
// diario (ACTIVITY_CRON_SECRET); mientras no exista el panel de administración
// (CYC-193) se llama a mano o desde un workflow. La respuesta solo trae conteos.
@Controller("internal/testflight")
export class TestflightController {
  constructor(
    private readonly testflight: TestflightService,
    private readonly config: ConfigService,
  ) {}

  @Throttle(LIMITS.tokenUse)
  @Post("retry")
  @HttpCode(HttpStatus.OK)
  retry(@Headers("authorization") authorization?: string) {
    const secret = this.config.get<string>("ACTIVITY_CRON_SECRET")?.trim();
    if (!secret) throw new NotFoundException();
    const given = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!timingSafeEqual(sha256(given), sha256(secret))) throw new UnauthorizedException();
    return this.testflight.retryPending();
  }
}
