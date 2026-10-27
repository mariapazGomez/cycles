import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CyclesService } from "./cycles.service";
import { CreateCycleDto } from "./dto/create-cycle.dto";
import { UpdateCycleDto } from "./dto/update-cycle.dto";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { AssignCycleDto } from "./dto/assign-cycle.dto";
import { ListCyclesQueryDto } from "./dto/list-cycles.query.dto";

@UseGuards(JwtAuthGuard)
@Controller("cycles")
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCycleDto) {
    return this.cyclesService.create(user.id, dto);
  }

  // Plantillas (ciclos sin atleta). Estas rutas van antes de ":id".
  @UseGuards(RolesGuard)
  @Roles("coach")
  @Post("templates")
  createTemplate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTemplateDto) {
    return this.cyclesService.createTemplate(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Patch("templates/:id")
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.cyclesService.updateTemplate(user.id, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Post(":id/assign")
  assign(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AssignCycleDto) {
    return this.cyclesService.assign(user.id, id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCyclesQueryDto) {
    return this.cyclesService.list(user, query);
  }

  @Get(":id")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cyclesService.getOne(user, id);
  }

  @Get(":id/children")
  getChildren(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cyclesService.getChildren(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles("coach")
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCycleDto,
  ) {
    return this.cyclesService.update(user.id, id, dto);
  }
}
