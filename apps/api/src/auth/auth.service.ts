import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { SecurityAlertService } from "../common/alerts/security-alert.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { CompleteProfileDto } from "./dto/complete-profile.dto";
import { GoogleProfile } from "./strategies/google.strategy";
import { generateJti, generateRawToken, hashToken } from "./token.util";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30; // 30 minutos
const OAUTH_CODE_TTL_MS = 1000 * 60; // 60 segundos: la web lo usa apenas llega
const OAUTH_CODE_RETENTION_MS = 1000 * 60 * 60 * 24; // se borran al día de vencer
const DATA_CONSENT_VERSION = "v1";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly alerts: SecurityAlertService,
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    if (dto.role === "athlete") {
      throw new ForbiddenException(
        "El registro de atletas es solo por invitación de un coach.",
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Ya existe una cuenta con este email.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
        authProvider: "local",
        dataConsentAt: dto.dataConsent ? new Date() : null,
        dataConsentVersion: dto.dataConsent ? DATA_CONSENT_VERSION : null,
      },
    });

    await this.issueEmailVerification(user);
    return { id: user.id, email: user.email };
  }

  // `ip` alimenta las alertas de seguridad (docs/PLAN-Seguridad.md, 1E).
  async login(dto: LoginDto, ip: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const matches = user?.passwordHash ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !matches) {
      this.alerts.failedLogin(ip, dto.email, "POST /auth/login");
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException("Verifica tu email antes de iniciar sesión.");
    }

    return this.issueTokenPair(user);
  }

  // Login con Google en dos pasos (docs/SEGURIDAD.md, S-02): el callback no
  // pone tokens en la URL, sino un código de un solo uso que la web cambia
  // por la sesión con exchangeGoogleCode.
  async loginWithGoogle(profile: GoogleProfile): Promise<string> {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          authProvider: "google",
          role: null,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!user.emailVerifiedAt) {
      // Google confirma la propiedad del email; aprovechamos para verificarlo
      // aunque la cuenta se haya creado originalmente de forma manual.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    return this.createOAuthExchangeCode(user.id);
  }

  async exchangeGoogleCode(rawCode: string): Promise<AuthTokens> {
    const now = new Date();
    const codeHash = hashToken(rawCode);
    // Marcar como usado en una sola operación: si llegan dos pedidos con el
    // mismo código, solo uno lo consume.
    const { count } = await this.prisma.oAuthExchangeCode.updateMany({
      where: { codeHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) {
      throw new UnauthorizedException("El inicio de sesión con Google expiró. Vuelve a intentarlo.");
    }

    const record = await this.prisma.oAuthExchangeCode.findUniqueOrThrow({
      where: { codeHash },
      include: { user: true },
    });
    return this.issueTokenPair(record.user);
  }

  private async createOAuthExchangeCode(userId: string): Promise<string> {
    const rawCode = generateRawToken();
    const now = Date.now();
    await this.prisma.$transaction([
      // Limpieza: los códigos vencidos ya no sirven para nada.
      this.prisma.oAuthExchangeCode.deleteMany({
        where: { expiresAt: { lt: new Date(now - OAUTH_CODE_RETENTION_MS) } },
      }),
      this.prisma.oAuthExchangeCode.create({
        data: {
          userId,
          codeHash: hashToken(rawCode),
          expiresAt: new Date(now + OAUTH_CODE_TTL_MS),
        },
      }),
    ]);
    return rawCode;
  }

  async completeProfile(userId: string, dto: CompleteProfileDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role) {
      throw new ConflictException("El rol ya fue asignado y no puede cambiarse aquí.");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role,
        dataConsentAt: dto.dataConsent ? new Date() : user.dataConsentAt,
        dataConsentVersion: dto.dataConsent ? DATA_CONSENT_VERSION : user.dataConsentVersion,
      },
    });
  }

  async refresh(rawRefreshToken: string, ip: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(rawRefreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token inválido");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (stored?.revokedAt) {
      // Reuso de un token ya rotado (fue consumido en un refresh anterior):
      // posible robo, se revocan todas las sesiones activas del usuario.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const owner = await this.prisma.user.findUnique({ where: { id: stored.userId } });
      this.alerts.refreshTokenReused(ip, owner?.email ?? stored.userId, "POST /auth/refresh");
      throw new UnauthorizedException("Refresh token inválido");
    }

    if (!stored || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
      throw new UnauthorizedException("Refresh token inválido");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException("El link de verificación es inválido o expiró.");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt) {
      await this.issueEmailVerification(user);
    }
    // Respuesta siempre genérica en el controller: no revelar si el email existe.
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return; // no revelar existencia de la cuenta ni si es solo-OAuth
    }

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const rawToken = generateRawToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    // Si el envío falla, la respuesta sigue siendo la misma (no revela si la
    // cuenta existe); el error queda en el log del MailService.
    await this.mail.sendPasswordResetEmail(user.email, rawToken).catch(() => undefined);
  }

  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("El link de recuperación es inválido o expiró.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async issueEmailVerification(user: User): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    const rawToken = generateRawToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });
    // El registro no falla por el email: el usuario puede pedir otro desde
    // "Revisa tu email" (POST /auth/verify-email/resend). Ver PLAN-Deploy §1.5.
    await this.mail.sendVerificationEmail(user.email, rawToken).catch(() => undefined);
  }

  // Público: también lo usa AthletesService para loguear automáticamente
  // al atleta al aceptar una invitación.
  async issueTokenPair(user: User): Promise<AuthTokens> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.get<string>("JWT_ACCESS_SECRET"), expiresIn: ACCESS_TOKEN_TTL },
    );

    // 'jti' evita que dos refresh tokens emitidos el mismo segundo para el
    // mismo usuario resulten en el mismo JWT (firma determinística), lo que
    // violaría la unicidad de tokenHash en RefreshToken.
    const refreshToken = this.jwt.sign(
      { sub: user.id, jti: generateJti() },
      {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
