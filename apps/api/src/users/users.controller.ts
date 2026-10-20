import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { AcceptPolicyDto } from "./dto/accept-policy.dto";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findPublicProfile(user.id);
  }

  @Post("me/policy-acceptance")
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptPolicy(@CurrentUser() user: AuthenticatedUser, @Body() _dto: AcceptPolicyDto): Promise<void> {
    await this.usersService.acceptPolicy(user.id);
  }
}
