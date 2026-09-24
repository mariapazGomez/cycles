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
import { RoutinesService } from "./routines.service";
import { CreateRoutineDto } from "./dto/create-routine.dto";
import { UpdateRoutineDto } from "./dto/update-routine.dto";

// Biblioteca de rutinas: siempre propia del coach, sin acceso de atleta
// (ver docs/prds/features/PRD-RutinasYProgramacion.md).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coach")
@Controller("routines")
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoutineDto) {
    return this.routinesService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.routinesService.list(user.id);
  }

  @Get(":id")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.routinesService.getOne(user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.routinesService.remove(user.id, id);
  }
}
