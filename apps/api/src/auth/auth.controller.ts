import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto, LogoutDto } from "./dto/tokens.dto";
import { VerifyEmailDto, ResendVerificationDto } from "./dto/email-verification.dto";
import { RequestPasswordResetDto, ConfirmPasswordResetDto } from "./dto/password-reset.dto";
import { CompleteProfileDto } from "./dto/complete-profile.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { GoogleProfile } from "./strategies/google.strategy";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: "Email verificado correctamente." };
  }

  @Post("verify-email/resend")
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return { message: "Si el email existe, se envió un nuevo link de verificación." };
  }

  @Post("password-reset/request")
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: "Si el email existe, se envió un link de recuperación." };
  }

  @Post("password-reset/confirm")
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword);
    return { message: "Contraseña actualizada correctamente." };
  }

  @UseGuards(JwtAuthGuard)
  @Post("complete-profile")
  @HttpCode(HttpStatus.OK)
  async completeProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteProfileDto,
  ) {
    await this.authService.completeProfile(user.id, dto);
    return { message: "Perfil completado." };
  }

  @UseGuards(AuthGuard("google"))
  @Get("google")
  googleAuth() {
    // El guard redirige a Google; no hay lógica propia aquí.
  }

  @UseGuards(AuthGuard("google"))
  @Get("google/callback")
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.loginWithGoogle(req.user as GoogleProfile);
    const frontendUrl = this.config.get<string>("FRONTEND_URL");
    const redirectUrl = new URL("/oauth-callback", frontendUrl);
    redirectUrl.searchParams.set("accessToken", tokens.accessToken);
    redirectUrl.searchParams.set("refreshToken", tokens.refreshToken);
    // Nota: pasar tokens por query string es una simplificación de MVP.
    // Antes de producción, mover a un intercambio vía cookie httpOnly o
    // código de un solo uso (ver PRD-Autenticacion, decisiones abiertas).
    res.redirect(redirectUrl.toString());
  }
}
