import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CoachProfileService } from "./coach-profile.service";
import { AnswerDto } from "./dto/answer.dto";

// Las respuestas del registro por pasos y de la encuesta (CYC-295). Cada quien solo
// las suyas.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
@Controller("users/me/coach-profile")
export class CoachProfileController {
  constructor(private readonly profiles: CoachProfileService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.get(user.id);
  }

  @Patch()
  answer(@CurrentUser() user: AuthenticatedUser, @Body() dto: AnswerDto) {
    return this.profiles.answer(user.id, dto.question, dto.values, dto.other);
  }
}
