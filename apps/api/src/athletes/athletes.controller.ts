import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { AthletesService } from "./athletes.service";
import { InviteAthleteDto } from "./dto/invite-athlete.dto";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";

@Controller("athletes")
export class AthletesController {
  constructor(private readonly athletesService: AthletesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coach")
  @Post("invite")
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteAthleteDto) {
    return this.athletesService.invite(user.id, dto);
  }

  @Post("invitations/accept")
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.athletesService.acceptInvitation(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coach")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.athletesService.listForCoach(user.id);
  }
}
