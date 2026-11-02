import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityNotifier } from "../activity/activity-notifier.service";
import { AuthService, AuthTokens } from "../auth/auth.service";
import { generateRawToken, hashToken } from "../auth/token.util";
import { InviteAthleteDto } from "./dto/invite-athlete.dto";
import { POLICY_VERSION, policyAcceptanceData } from "../common/policy";

export type AcceptResult = { linked: true } | { linked: false; tokens: AuthTokens };

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

@Injectable()
export class AthletesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly authService: AuthService,
    private readonly activity: ActivityNotifier,
  ) {}

  async invite(coachId: string, dto: InviteAthleteDto): Promise<{ id: string; email: string }> {
    // Un correo sin cuenta crea al atleta incompleto (lo activa con su contraseña).
    // Un atleta que ya se registró solo y no tiene coach activo se vincula sin
    // crear otra cuenta: acepta desde el correo. Cualquier otra cuenta (coach,
    // admin, atleta con coach activo) se rechaza. Ver PRD-InvitacionAtletas §3.
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { athleteRelations: { select: { coachId: true, status: true } } },
    });
    if (existing) {
      const linkable = existing.role === "athlete" && !existing.athleteRelations.some((r) => r.status === "active");
      if (!linkable) {
        throw new ConflictException("Ya existe una cuenta con este email.");
      }
      if (existing.athleteRelations.some((r) => r.coachId === coachId)) {
        throw new ConflictException("Este atleta ya está en tu lista.");
      }
    }

    const athlete =
      existing ??
      (await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, role: "athlete", authProvider: "local" },
      }));

    const coachAthlete = await this.prisma.coachAthlete.create({
      data: { coachId, athleteId: athlete.id, status: "pending" },
    });

    const rawToken = generateRawToken();
    await this.prisma.athleteInvitationToken.create({
      data: {
        coachAthleteId: coachAthlete.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { name: true } });
    try {
      await this.mail.sendAthleteInvitationEmail(athlete.email, rawToken, coach.name);
    } catch {
      // Si el email no salió, se deshace lo creado: si no, el email quedaría
      // tomado y no se podría volver a invitar. Ver PLAN-Deploy §1.5. La cuenta de
      // un atleta que ya existía no se toca.
      await this.prisma.$transaction([
        this.prisma.athleteInvitationToken.deleteMany({ where: { coachAthleteId: coachAthlete.id } }),
        this.prisma.coachAthlete.delete({ where: { id: coachAthlete.id } }),
        ...(existing ? [] : [this.prisma.user.delete({ where: { id: athlete.id } })]),
      ]);
      throw new ServiceUnavailableException("No pudimos enviar la invitación. Intenta de nuevo en unos minutos.");
    }

    this.activity.invitationSent(coachId);
    return { id: coachAthlete.id, email: athlete.email };
  }

  // Lo que la página de la invitación necesita saber: quién invita y si la persona
  // ya tiene cuenta (entonces no se le pide contraseña).
  async previewInvitation(rawToken: string): Promise<{ coachName: string; hasAccount: boolean }> {
    const record = await this.prisma.athleteInvitationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { coachAthlete: { include: { athlete: true, coach: { select: { name: true } } } } },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("El link de invitación es inválido o expiró.");
    }
    const { athlete, coach } = record.coachAthlete;
    return { coachName: coach.name, hasAccount: Boolean(athlete.passwordHash) || athlete.authProvider !== "local" };
  }

  // Cuenta nueva: define su contraseña y entra. Atleta que ya tenía cuenta: el
  // enlace del correo basta para vincularlo, sin cambiar su contraseña ni abrirle
  // sesión (entra como siempre).
  async acceptInvitation(rawToken: string, password: string | undefined): Promise<AcceptResult> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.athleteInvitationToken.findUnique({
      where: { tokenHash },
      include: { coachAthlete: { include: { athlete: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("El link de invitación es inválido o expiró.");
    }

    const athleteId = record.coachAthlete.athleteId;
    const alreadyHasAccount = Boolean(record.coachAthlete.athlete.passwordHash) || record.coachAthlete.athlete.authProvider !== "local";
    if (!alreadyHasAccount && !password) {
      throw new BadRequestException("Define una contraseña para activar tu cuenta.");
    }

    const accountUpdate = alreadyHasAccount
      ? { emailVerifiedAt: record.coachAthlete.athlete.emailVerifiedAt ?? new Date() }
      : { passwordHash: await bcrypt.hash(password as string, 12), emailVerifiedAt: new Date() };

    const [, , athlete] = await this.prisma.$transaction([
      this.prisma.athleteInvitationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.coachAthlete.update({
        where: { id: record.coachAthleteId },
        data: { status: "active" },
      }),
      this.prisma.user.update({ where: { id: athleteId }, data: accountUpdate }),
      // La aceptación de los Términos y la Política queda guardada con su versión.
      this.prisma.policyAcceptance.upsert({
        where: { userId_version: { userId: athleteId, version: POLICY_VERSION } },
        update: {},
        create: { userId: athleteId, ...policyAcceptanceData("invitation") },
      }),
    ]);

    this.activity.athleteJoined(athlete.id, record.coachAthlete.coachId);
    if (alreadyHasAccount) {
      return { linked: true };
    }
    return { linked: false, tokens: await this.authService.issueTokenPair(athlete) };
  }

  async listForCoach(coachId: string) {
    const relations = await this.prisma.coachAthlete.findMany({
      where: { coachId },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
    });

    return relations.map((relation) => ({
      id: relation.id,
      status: relation.status,
      athlete: {
        id: relation.athlete.id,
        name: relation.athlete.name,
        email: relation.athlete.email,
      },
    }));
  }
}
