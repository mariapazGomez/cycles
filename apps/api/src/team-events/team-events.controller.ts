import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { TeamEventsService } from "./team-events.service";

// Eventos, calendario y ranking de un equipo (CYC-317). Solo el coach dueño; lo ajeno responde 404.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
@Controller("teams/:id")
export class TeamEventsController {
  constructor(private readonly service: TeamEventsService) {}

  @Get("events")
  list(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() query: Record<string, unknown>) {
    return this.service.list(user.id, id, query);
  }

  @Post("events")
  create(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.service.create(user.id, id, body);
  }

  @Patch("events/:eventId")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Param("eventId", ParseUUIDPipe) eventId: string, @Body() body: unknown) {
    return this.service.update(user.id, id, eventId, body);
  }

  @Delete("events/:eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Param("eventId", ParseUUIDPipe) eventId: string): Promise<void> {
    await this.service.remove(user.id, id, eventId);
  }

  @Get("calendar")
  calendar(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() query: Record<string, unknown>) {
    return this.service.calendar(user.id, id, query);
  }

  @Get("rankings")
  rankings(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query("period") period: unknown) {
    return this.service.rankings(user.id, id, period);
  }
}

// El atleta solo lee los eventos de sus equipos. Ruta aparte de /me/events: la app instalada no
// recibe eventos que no puede editar.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("athlete")
@Controller("me/team-events")
export class MyTeamEventsController {
  constructor(private readonly service: TeamEventsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    return this.service.listMine(user.id, query);
  }
}
