import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { AccountService } from "./account.service";
import { AcceptPolicyDto } from "./dto/accept-policy.dto";
import { DataConsentDto } from "./dto/data-consent.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountService: AccountService,
  ) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findPublicProfile(user.id);
  }

  @Post("me/policy-acceptance")
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptPolicy(@CurrentUser() user: AuthenticatedUser, @Body() _dto: AcceptPolicyDto): Promise<void> {
    await this.usersService.acceptPolicy(user.id);
  }

  // Retirar (o volver a dar) el consentimiento opcional de estadísticas.
  @Patch("me/data-consent")
  @HttpCode(HttpStatus.NO_CONTENT)
  async setDataConsent(@CurrentUser() user: AuthenticatedUser, @Body() dto: DataConsentDto): Promise<void> {
    await this.accountService.setDataConsent(user.id, dto.dataConsent);
  }

  // Descarga de todos los datos de la persona.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get("me/export")
  exportData(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.exportData(user.id);
  }

  // Eliminar la cuenta (derecho de supresión y regla 5.1.1(v) de Apple).
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: AuthenticatedUser, @Body() _dto: DeleteAccountDto): Promise<void> {
    await this.accountService.deleteAccount(user.id);
  }
}
