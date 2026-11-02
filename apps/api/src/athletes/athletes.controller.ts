import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { deliverTokens } from "../common/auth-cookie";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { LIMITS } from "../common/throttle/throttle";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { AthletesService } from "./athletes.service";
import { InviteAthleteDto } from "./dto/invite-athlete.dto";
import { AcceptInvitationDto, PreviewInvitationDto } from "./dto/accept-invitation.dto";

@Controller("athletes")
export class AthletesController {
  constructor(
    private readonly athletesService: AthletesService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coach")
  @Throttle(LIMITS.invite)
  @Post("invite")
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteAthleteDto) {
    return this.athletesService.invite(user.id, dto);
  }

  @Throttle(LIMITS.tokenUse)
  @Post("invitations/preview")
  @HttpCode(HttpStatus.OK)
  previewInvitation(@Body() dto: PreviewInvitationDto) {
    return this.athletesService.previewInvitation(dto.token);
  }

  @Throttle(LIMITS.tokenUse)
  @Post("invitations/accept")
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Body() dto: AcceptInvitationDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.athletesService.acceptInvitation(dto.token, dto.password);
    if (result.linked) {
      return { linked: true };
    }
    return {
      linked: false,
      ...deliverTokens(req, res, result.tokens, this.config.get<string>("NODE_ENV") === "production"),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coach")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.athletesService.listForCoach(user.id);
  }
}
