import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ExercisesService } from "./exercises.service";
import { CreateExerciseDto } from "./dto/create-exercise.dto";

@UseGuards(JwtAuthGuard)
@Controller("exercises")
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.list(user);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Patch(":id/deactivate")
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.exercisesService.deactivate(user.id, id);
  }
}
