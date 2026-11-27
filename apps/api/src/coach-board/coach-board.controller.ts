import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CoachBoardService } from "./coach-board.service";
import { BoardAdherenceQueryDto, BoardEventsQueryDto, BoardSessionsQueryDto } from "./dto/board.query.dto";

// Consultas agrupadas del coach (CYC-325). Solo lectura y siempre sobre el coach de la sesión.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
@Controller("coach/board")
export class CoachBoardController {
  constructor(private readonly service: CoachBoardService) {}

  @Get("sessions")
  sessions(@CurrentUser() user: AuthenticatedUser, @Query() query: BoardSessionsQueryDto) {
    return this.service.sessions(user.id, query);
  }

  @Get("events")
  events(@CurrentUser() user: AuthenticatedUser, @Query() query: BoardEventsQueryDto) {
    return this.service.athleteEvents(user.id, query);
  }

  @Get("adherence")
  adherence(@CurrentUser() user: AuthenticatedUser, @Query() query: BoardAdherenceQueryDto) {
    return this.service.adherence(user.id, query);
  }
}
