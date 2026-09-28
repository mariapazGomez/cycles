import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { createHash, timingSafeEqual } from "crypto";
import { LIMITS } from "../common/throttle/throttle";
import { ActivityNotifier } from "./activity-notifier.service";
import { isValidDay } from "./chile-time";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Endpoint interno que dispara el resumen diario. Lo llama un workflow
// programado de GitHub Actions (.github/workflows/resumen-actividad.yml) con
// `Authorization: Bearer <ACTIVITY_CRON_SECRET>`. Sin el secreto configurado
// la ruta no existe (404). El repo es público: la respuesta nunca incluye los
// totales, solo si se envió.
@Controller("internal/activity")
export class ActivityController {
  constructor(
    private readonly notifier: ActivityNotifier,
    private readonly config: ConfigService,
  ) {}

  @Throttle(LIMITS.tokenUse)
  @Post("daily-summary")
  @HttpCode(HttpStatus.OK)
  dailySummary(@Headers("authorization") authorization?: string, @Query("day") day?: string) {
    const secret = this.config.get<string>("ACTIVITY_CRON_SECRET")?.trim();
    if (!secret) {
      throw new NotFoundException();
    }
    const given = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!timingSafeEqual(sha256(given), sha256(secret))) {
      throw new UnauthorizedException();
    }
    if (day !== undefined && !isValidDay(day)) {
      throw new BadRequestException("day debe tener el formato AAAA-MM-DD.");
    }
    return this.notifier.sendDailySummary(day);
  }
}
