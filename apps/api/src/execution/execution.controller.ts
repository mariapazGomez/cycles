import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ExecutionService } from "./execution.service";
import { LogSetDto } from "./dto/log-set.dto";
import { SessionFeedbackDto } from "./dto/session-feedback.dto";
import { ScheduleSessionDto } from "./dto/schedule-session.dto";
import { TodayQueryDto } from "./dto/today-query.dto";
import { SummaryQueryDto } from "./dto/summary-query.dto";

// Endpoints del atleta para registrar lo que hizo — ver
// docs/prds/features/PRD-EjecucionYSeguimiento.md, sección 6.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("athlete")
@Controller()
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get("me/today")
  today(@CurrentUser() user: AuthenticatedUser, @Query() query: TodayQueryDto) {
    return this.executionService.today(user.id, query);
  }

  // Series y carga por grupo muscular de cada sesión entrenada de un plan, para
  // el Resumen del atleta.
  @Get("me/summary")
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: SummaryQueryDto) {
    return this.executionService.muscleSummary(user.id, query.cycleId);
  }

  // El coach define cuántas sesiones por semana; el atleta elige el día de cada una.
  @Patch("sessions/:id/schedule")
  schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ScheduleSessionDto,
  ) {
    return this.executionService.scheduleSession(user.id, id, dto);
  }

  @Post("sessions/:id/start")
  start(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.executionService.startSession(user.id, id);
  }

  // Devuelve una sesión hecha o no hecha a pendiente (el cierre queda inactivo).
  @Post("sessions/:id/reopen")
  reopen(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.executionService.reopenSession(user.id, id);
  }

  @Post("session-exercises/:id/logs")
  logSet(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: LogSetDto) {
    return this.executionService.logSet(user.id, id, dto);
  }

  @Post("sessions/:id/feedback")
  feedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SessionFeedbackDto,
  ) {
    return this.executionService.submitFeedback(user.id, id, dto);
  }
}
