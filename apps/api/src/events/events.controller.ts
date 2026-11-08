import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { EventsService } from "./events.service";

// Actividades paralelas del atleta (CYC-251): voleibol, partidos de liga… Solo las suyas; no
// dependen de un coach ni de un ciclo. Ver docs/diseno/eventos-paralelos.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("athlete")
@Controller("me/events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    return this.events.listMine(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.events.create(user.id, body);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: unknown) {
    return this.events.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Query() query: Record<string, unknown>): Promise<void> {
    await this.events.remove(user.id, id, query);
  }
}

// El coach solo lee las de sus atletas con relación activa, sin las notas.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
@Controller("athletes/:athleteId/events")
export class CoachEventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("athleteId") athleteId: string, @Query() query: Record<string, unknown>) {
    return this.events.listForCoach(user.id, athleteId, query);
  }
}
