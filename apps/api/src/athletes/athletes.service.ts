import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuthService, AuthTokens } from "../auth/auth.service";
import { generateRawToken, hashToken } from "../auth/token.util";
import { InviteAthleteDto } from "./dto/invite-athlete.dto";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

@Injectable()
export class AthletesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly authService: AuthService,
  ) {}

  async invite(coachId: string, dto: InviteAthleteDto): Promise<{ id: string; email: string }> {
    // Alcance de esta iteración: si el email ya existe como CUALQUIER
    // cuenta (coach, atleta con o sin coach activo, admin), se rechaza.
    // Ver docs/prds/features/PRD-InvitacionAtletas.md, sección 3.
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Ya existe una cuenta con este email.");
    }

    const athlete = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: "athlete",
        authProvider: "local",
      },
    });

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

    await this.mail.sendAthleteInvitationEmail(athlete.email, rawToken);

    return { id: coachAthlete.id, email: athlete.email };
  }

  async acceptInvitation(rawToken: string, password: string): Promise<AuthTokens> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.athleteInvitationToken.findUnique({
      where: { tokenHash },
      include: { coachAthlete: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("El link de invitación es inválido o expiró.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [, , athlete] = await this.prisma.$transaction([
      this.prisma.athleteInvitationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.coachAthlete.update({
        where: { id: record.coachAthleteId },
        data: { status: "active" },
      }),
      this.prisma.user.update({
        where: { id: record.coachAthlete.athleteId },
        data: { passwordHash, emailVerifiedAt: new Date() },
      }),
    ]);

    return this.authService.issueTokenPair(athlete);
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
