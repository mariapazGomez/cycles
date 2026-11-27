import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { SaveSessionStructureDto } from "../sessions/dto/save-session-structure.dto";
import { TeamCyclesService } from "./team-cycles.service";
import { AddTeamSessionDto, CreateTeamCycleDto, DuplicateTeamSessionDto, JoinTeamCycleDto, TeamCycleDatesDto, TeamCycleDetailsQueryDto, TodayQueryDto, UpdateTeamCycleDto, UpdateTeamSessionDto } from "./dto/team-cycle.dto";

// Ciclo del equipo (CYC-314). Solo el coach dueño; lo ajeno responde 404.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
export class TeamCyclesController {
  constructor(private readonly service: TeamCyclesService) {}

  @Post("teams/:id/cycles/preview")
  @HttpCode(HttpStatus.OK)
  preview(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: TeamCycleDatesDto) {
    return this.service.preview(user.id, id, dto);
  }

  @Post("teams/:id/cycles")
  create(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateTeamCycleDto) {
    return this.service.create(user.id, id, dto);
  }

  @Get("teams/:id/cycles")
  list(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.list(user.id, id);
  }

  @Get("teams/:id/cycle-details")
  details(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() q: TeamCycleDetailsQueryDto) {
    return this.service.details(user.id, id, q);
  }

  @Get("teams/:id/members/:athleteId/removal-impact")
  memberImpact(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Param("athleteId", ParseUUIDPipe) athleteId: string, @Query() q: TodayQueryDto) {
    return this.service.memberImpact(user.id, id, athleteId, q.today);
  }

  @Get("team-cycles/:id")
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() q: TodayQueryDto) {
    return this.service.detail(user.id, id, q.today);
  }

  @Patch("team-cycles/:id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTeamCycleDto) {
    return this.service.update(user.id, id, dto);
  }

  @Get("team-cycles/:id/removal-impact")
  cycleImpact(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() q: TodayQueryDto) {
    return this.service.cycleImpact(user.id, id, q.today);
  }

  @Delete("team-cycles/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() q: TodayQueryDto) {
    await this.service.remove(user.id, id, q.today);
  }

  @Post("team-cycles/:id/sessions")
  addSession(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AddTeamSessionDto) {
    return this.service.addSession(user.id, id, dto);
  }

  @Post("team-sessions/:id/duplicate")
  duplicate(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DuplicateTeamSessionDto) {
    return this.service.duplicateSession(user.id, id, dto);
  }

  @Post("team-cycles/:id/members")
  join(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: JoinTeamCycleDto) {
    return this.service.join(user.id, id, dto.athleteIds, dto.today);
  }

  @Patch("team-sessions/:id")
  updateSession(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTeamSessionDto) {
    return this.service.updateSession(user.id, id, dto);
  }

  @Put("team-sessions/:id/structure")
  saveStructure(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SaveSessionStructureDto, @Query() q: TodayQueryDto) {
    return this.service.saveStructure(user.id, id, dto, q.today);
  }

  @Delete("team-sessions/:id")
  deleteSession(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() q: TodayQueryDto) {
    return this.service.deleteSession(user.id, id, q.today);
  }
}
