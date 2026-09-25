import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ExecutionService } from "./execution.service";
import { LogSetDto } from "./dto/log-set.dto";
import { SessionFeedbackDto } from "./dto/session-feedback.dto";

// Endpoints del atleta para registrar lo que hizo — ver
// docs/prds/features/PRD-EjecucionYSeguimiento.md, sección 6.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("athlete")
@Controller()
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get("me/today")
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.executionService.today(user.id);
  }

  @Post("sessions/:id/start")
  start(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.executionService.startSession(user.id, id);
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
