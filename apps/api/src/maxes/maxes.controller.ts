import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { assertActiveRelation } from "../common/access";
import { PrismaService } from "../prisma/prisma.service";
import { MaxesService } from "./maxes.service";
import { RecordMaxDto } from "./dto/record-max.dto";

// RM del atleta por ejercicio (CYC-306). El coach necesita relación activa (R5); el atleta
// solo lee lo suyo. Por ahora el atleta no escribe su RM.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MaxesController {
  constructor(
    private readonly maxes: MaxesService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles("coach")
  @Get("athletes/:athleteId/rm")
  async listForAthlete(@CurrentUser() user: AuthenticatedUser, @Param("athleteId") athleteId: string) {
    await assertActiveRelation(this.prisma, user.id, athleteId);
    return this.maxes.list(athleteId);
  }

  @Roles("coach")
  @Get("athletes/:athleteId/rm/:exerciseId")
  async detailForAthlete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("athleteId") athleteId: string,
    @Param("exerciseId") exerciseId: string,
  ) {
    await assertActiveRelation(this.prisma, user.id, athleteId);
    return this.maxes.detail(athleteId, exerciseId);
  }

  @Roles("coach")
  @Post("athletes/:athleteId/rm/:exerciseId")
  record(
    @CurrentUser() user: AuthenticatedUser,
    @Param("athleteId") athleteId: string,
    @Param("exerciseId") exerciseId: string,
    @Body() dto: RecordMaxDto,
  ) {
    return this.maxes.record(user.id, athleteId, exerciseId, dto);
  }

  @Roles("athlete")
  @Get("me/rm")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.maxes.list(user.id);
  }

  @Roles("athlete")
  @Get("me/rm/:exerciseId")
  detailMine(@CurrentUser() user: AuthenticatedUser, @Param("exerciseId") exerciseId: string) {
    return this.maxes.detail(user.id, exerciseId);
  }
}
