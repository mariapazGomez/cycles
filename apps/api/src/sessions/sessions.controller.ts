import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { SessionsService } from "./sessions.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { UpdateSessionDto } from "./dto/update-session.dto";
import { AddSessionExerciseDto } from "./dto/add-session-exercise.dto";
import { UpdateSessionExerciseDto } from "./dto/update-session-exercise.dto";

// Rutas anidadas a mano (en vez de dos @Controller separados) porque las
// sesiones se crean/listan bajo un ciclo, pero se editan/borran por su
// propio id — ver docs/prds/features/PRD-CRUDSesiones.md.
@UseGuards(JwtAuthGuard)
@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Post("cycles/:cycleId/sessions")
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("cycleId") cycleId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.createSession(user.id, cycleId, dto);
  }

  @Get("cycles/:cycleId/sessions")
  listSessions(@CurrentUser() user: AuthenticatedUser, @Param("cycleId") cycleId: string) {
    return this.sessionsService.listSessions(user, cycleId);
  }

  @Get("sessions/:id")
  getSession(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.sessionsService.getSessionDetail(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Patch("sessions/:id")
  updateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.updateSession(user.id, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Delete("sessions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.sessionsService.deleteSession(user.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Post("sessions/:sessionId/exercises")
  addExercise(
    @CurrentUser() user: AuthenticatedUser,
    @Param("sessionId") sessionId: string,
    @Body() dto: AddSessionExerciseDto,
  ) {
    return this.sessionsService.addExercise(user.id, sessionId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Patch("session-exercises/:id")
  updateExercise(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSessionExerciseDto,
  ) {
    return this.sessionsService.updateExercise(user.id, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Delete("session-exercises/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeExercise(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.sessionsService.removeExercise(user.id, id);
  }
}
