import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CyclesService } from "./cycles.service";
import { CreateCycleDto } from "./dto/create-cycle.dto";
import { UpdateCycleDto } from "./dto/update-cycle.dto";
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

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCyclesQueryDto) {
    return this.cyclesService.list(user, query);
  }

  @Get(":id")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cyclesService.getOne(user, id);
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
