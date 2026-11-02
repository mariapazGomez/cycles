import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Ip,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { LIMITS } from "../common/throttle/throttle";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto, LogoutDto, GoogleExchangeDto, SocialLoginDto } from "./dto/tokens.dto";
import { VerifyEmailDto, ResendVerificationDto } from "./dto/email-verification.dto";
import { RequestPasswordResetDto, ConfirmPasswordResetDto } from "./dto/password-reset.dto";
import { CompleteProfileDto } from "./dto/complete-profile.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { GoogleProfile } from "./strategies/google.strategy";
import {
  assertAllowedOrigin,
  clearRefreshCookie,
  deliverTokens,
  isWebClient,
  readRefreshCookie,
} from "../common/auth-cookie";
import { corsOrigins } from "../common/config/env.validation";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle(LIMITS.register)
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(LIMITS.login)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return deliverTokens(req, res, await this.authService.login(dto, ip), this.secureCookies);
  }

  @Throttle(LIMITS.refresh)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const web = isWebClient(req);
    // En la web el token viene de la cookie; el cuerpo solo lo usa el puente temporal
    // para sesiones guardadas antes de la cookie (CYC-89) y la app móvil.
    const token = dto.refreshToken ?? (web ? this.cookieToken(req) : undefined);
    if (!token) {
      throw new UnauthorizedException("Refresh token inválido");
    }
    try {
      return deliverTokens(req, res, await this.authService.refresh(token, ip), this.secureCookies);
    } catch (error) {
      // Un token rechazado no sirve de nada: se borra la cookie para no repetir el intento.
      if (web && error instanceof UnauthorizedException) clearRefreshCookie(res, this.secureCookies);
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const web = isWebClient(req);
    const token = dto.refreshToken ?? (web ? this.cookieToken(req) : undefined);
    if (web) clearRefreshCookie(res, this.secureCookies);
    if (!token) {
      if (web) return; // ya no había sesión: nada que revocar
      throw new BadRequestException("Falta el refresh token.");
    }
    await this.authService.logout(token);
  }

  @Throttle(LIMITS.tokenUse)
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: "Email verificado correctamente." };
  }

  @Throttle(LIMITS.emailLink)
  @Post("verify-email/resend")
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return { message: "Si el email existe, se envió un nuevo link de verificación." };
  }

  @Throttle(LIMITS.emailLink)
  @Post("password-reset/request")
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: "Si el email existe, se envió un link de recuperación." };
  }

  @Throttle(LIMITS.tokenUse)
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
    // Solo un código de un solo uso (60 s) viaja en la URL; los tokens se
    // entregan en el cuerpo de POST /auth/google/exchange. Ver
    // docs/SEGURIDAD.md, hallazgo S-02.
    const redirectUrl = new URL("/oauth-callback", this.config.get<string>("FRONTEND_URL"));
    try {
      const code = await this.authService.loginWithGoogle(req.user as GoogleProfile);
      redirectUrl.searchParams.set("code", code);
    } catch (error) {
      // Registro cerrado: Google no puede crear cuentas nuevas por ahora.
      if (!(error instanceof ForbiddenException)) throw error;
      redirectUrl.searchParams.set("error", "registration_closed");
    }
    res.redirect(redirectUrl.toString());
  }

  // Inicio de sesión nativo de la app (docs/diseno/login-social-ios).
  @Throttle(LIMITS.login)
  @Post("google/token")
  @HttpCode(HttpStatus.OK)
  async googleToken(@Body() dto: SocialLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return deliverTokens(req, res, await this.authService.loginWithIdentityToken("google", dto), this.secureCookies);
  }

  @Throttle(LIMITS.login)
  @Post("apple")
  @HttpCode(HttpStatus.OK)
  async appleLogin(@Body() dto: SocialLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return deliverTokens(req, res, await this.authService.loginWithIdentityToken("apple", dto), this.secureCookies);
  }

  @Throttle(LIMITS.tokenUse)
  @Post("google/exchange")
  @HttpCode(HttpStatus.OK)
  async exchangeGoogleCode(@Body() dto: GoogleExchangeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return deliverTokens(req, res, await this.authService.exchangeGoogleCode(dto.code), this.secureCookies);
  }

  // La cookie solo viaja en `Secure` en producción (en local se usa http).
  private get secureCookies(): boolean {
    return this.config.get<string>("NODE_ENV") === "production";
  }

  // Lee la cookie y exige que el pedido venga de la web de Cycles (CSRF).
  private cookieToken(req: Request): string | undefined {
    const token = readRefreshCookie(req);
    if (token) assertAllowedOrigin(req, corsOrigins(this.config));
    return token;
  }
}
