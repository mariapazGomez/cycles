import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { TeamsService } from "./teams.service";
import { TodayQueryDto } from "../team-cycles/dto/team-cycle.dto";
import { AddTeamMembersDto, CreateTeamDto, RenameTeamDto } from "./dto/team.dto";

// Equipos del coach (CYC-309). Solo web del coach: el atleta no ve equipos.
@Controller("teams")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.teams.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto.name, dto.athleteIds);
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.teams.detail(user.id, id);
  }

  @Patch(":id")
  rename(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: RenameTeamDto) {
    return this.teams.rename(user.id, id, dto.name);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Query() q: TodayQueryDto) {
    await this.teams.remove(user.id, id, q.today);
  }

  @Post(":id/members")
  addMembers(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AddTeamMembersDto) {
    return this.teams.addMembers(user.id, id, dto.athleteIds);
  }

  @Delete(":id/members/:athleteId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("athleteId", ParseUUIDPipe) athleteId: string,
    @Query() q: TodayQueryDto,
  ) {
    await this.teams.removeMember(user.id, id, athleteId, q.today);
  }
}
