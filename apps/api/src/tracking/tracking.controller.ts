import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { TrackingService } from "./tracking.service";
import { CreateLoadAdjustmentDto } from "./dto/create-load-adjustment.dto";
import { SummaryQueryDto } from "./dto/summary.query.dto";

// Seguimiento del coach — ver docs/prds/features/PRD-EjecucionYSeguimiento.md, sección 6.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get("coach/attention")
  attention(@CurrentUser() user: AuthenticatedUser) {
    return this.trackingService.attention(user.id);
  }

  @Get("athletes/:athleteId/summary")
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param("athleteId") athleteId: string,
    @Query() query: SummaryQueryDto,
  ) {
    return this.trackingService.athleteSummary(user.id, athleteId, query.weeks);
  }

  @Get("cycles/:id/progress")
  progress(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.trackingService.cycleProgress(user.id, id);
  }

  @Post("cycles/:id/load-adjustments")
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateLoadAdjustmentDto,
  ) {
    return this.trackingService.createLoadAdjustment(user.id, id, dto);
  }
}
