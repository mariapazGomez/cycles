import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { POLICY_VERSION } from "../common/policy";
import { PosthogService } from "./posthog.service";
import type { EmailAddressDto } from "./dto/email-address.dto";

const PAGE_SIZE = 25;
const IOS_VERSION_KEY = "ios_version";

export interface UsersQuery {
  kind: "real" | "demo";
  q?: string;
  role?: "coach" | "athlete";
  verified?: "yes" | "no";
  page: number;
}

// Lo que el portal del equipo muestra. Siempre lo mínimo: nunca contraseñas,
// tokens ni datos de entrenamiento o salud (docs/SEGURIDAD.md, R1–R12).
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posthog: PosthogService,
  ) {}

  // Cada consulta de datos de personas queda registrada con el correo del token.
  async log(email: string, view: string, detail?: string): Promise<void> {
    await this.prisma.adminAccessLog.create({ data: { email, view, detail: detail ?? null } });
  }

  accessLog() {
    return this.prisma.adminAccessLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { email: true, view: true, detail: true, createdAt: true },
    });
  }

  async users(query: UsersQuery) {
    const where: Prisma.UserWhereInput = { isDemo: query.kind === "demo" };
    if (query.role) where.role = query.role as UserRole;
    if (query.verified === "yes") where.emailVerifiedAt = { not: null };
    if (query.verified === "no") where.emailVerifiedAt = null;
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isDemo: true,
          createdAt: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          policyAcceptances: { orderBy: { acceptedAt: "desc" }, take: 1, select: { version: true } },
        },
      }),
    ]);
    return {
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      currentPolicy: POLICY_VERSION,
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isDemo: u.isDemo,
        createdAt: u.createdAt,
        emailVerified: u.emailVerifiedAt !== null,
        lastLoginAt: u.lastLoginAt,
        policy: u.policyAcceptances[0]?.version ?? null,
      })),
    };
  }

  async userDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDemo: true,
        phonePlatform: true,
        tourStatus: true,
        createdAt: true,
        lastLoginAt: true,
        coachRelations: { select: { status: true, athlete: { select: { name: true } } } },
        athleteRelations: { select: { status: true, coach: { select: { name: true } } } },
      },
    });
    if (!user) throw new NotFoundException("No encontramos esa cuenta.");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isDemo: user.isDemo,
      phonePlatform: user.phonePlatform,
      tourStatus: user.tourStatus,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      athletes: user.coachRelations.map((r) => ({ name: r.athlete.name, status: r.status })),
      coaches: user.athleteRelations.map((r) => ({ name: r.coach.name, status: r.status })),
    };
  }

  // Solo cuentas reales; las demo se cuentan aparte y no suman en nada.
  async summary() {
    const real: Prisma.UserWhereInput = { isDemo: false };
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    const [coaches, athletes, demo, last7, last30, coachesInviting, athletesTraining] = await Promise.all([
      this.prisma.user.count({ where: { ...real, role: "coach" } }),
      this.prisma.user.count({ where: { ...real, role: "athlete" } }),
      this.prisma.user.count({ where: { isDemo: true } }),
      this.prisma.user.count({ where: { ...real, createdAt: { gte: daysAgo(7) } } }),
      this.prisma.user.count({ where: { ...real, createdAt: { gte: daysAgo(30) } } }),
      this.prisma.user.count({ where: { ...real, role: "coach", coachRelations: { some: {} } } }),
      this.prisma.user.count({
        where: { ...real, role: "athlete", cyclesAsAthlete: { some: { sessions: { some: { status: { in: ["completed", "skipped"] } } } } } },
      }),
    ]);
    return {
      real: { total: coaches + athletes, coaches, athletes },
      demo: { total: demo },
      registrations: { last7Days: last7, last30Days: last30 },
      coachesWithInvitedAthletes: { count: coachesInviting, of: coaches },
      athletesWithClosedSession: { count: athletesTraining, of: athletes },
    };
  }

  // Uso en PostHog por usuario y por pantalla, sin cuentas demo.
  async usage(days: 7 | 30) {
    if (!this.posthog.connected) return { status: "not_connected" as const };
    const demo = await this.prisma.user.findMany({ where: { isDemo: true }, select: { id: true } });
    const { users, screens } = await this.posthog.usage(days, demo.map((d) => d.id));
    const accounts = await this.prisma.user.findMany({
      where: { id: { in: users.map((u) => u.distinctId) }, isDemo: false },
      select: { id: true, name: true, role: true },
    });
    const byId = new Map(accounts.map((a) => [a.id, a]));
    return {
      status: "ok" as const,
      days,
      // Solo personas que existen en la base y no son demo.
      users: users
        .filter((u) => byId.has(u.distinctId))
        .map((u) => ({ ...u, name: byId.get(u.distinctId)!.name, role: byId.get(u.distinctId)!.role })),
      screens,
    };
  }

  listEmails() {
    return this.prisma.emailAddress.findMany({ orderBy: { address: "asc" } });
  }

  async createEmail(dto: EmailAddressDto) {
    try {
      return await this.prisma.emailAddress.create({ data: { ...dto, address: dto.address.trim().toLowerCase() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Esa dirección ya está en el directorio.");
      }
      throw error;
    }
  }

  async updateEmail(id: string, dto: EmailAddressDto) {
    try {
      return await this.prisma.emailAddress.update({ where: { id }, data: { ...dto, address: dto.address.trim().toLowerCase() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new NotFoundException("No encontramos esa dirección.");
        if (error.code === "P2002") throw new ConflictException("Esa dirección ya está en el directorio.");
      }
      throw error;
    }
  }

  async deleteEmail(id: string): Promise<void> {
    const { count } = await this.prisma.emailAddress.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException("No encontramos esa dirección.");
  }

  async versions() {
    const [migration, ios] = await Promise.all([
      this.prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
        SELECT migration_name, finished_at FROM _prisma_migrations
        WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`,
      this.prisma.adminSetting.findUnique({ where: { key: IOS_VERSION_KEY } }),
    ]);
    return {
      api: { commit: (process.env.RENDER_GIT_COMMIT ?? "").slice(0, 7) || null },
      database: { lastMigration: migration[0]?.migration_name ?? null, appliedAt: migration[0]?.finished_at ?? null },
      policyVersion: POLICY_VERSION,
      ios: { version: ios?.value ?? null, updatedAt: ios?.updatedAt ?? null },
    };
  }

  async setIosVersion(value: string) {
    const v = value.trim();
    if (!v) {
      await this.prisma.adminSetting.deleteMany({ where: { key: IOS_VERSION_KEY } });
      return { version: null };
    }
    await this.prisma.adminSetting.upsert({
      where: { key: IOS_VERSION_KEY },
      create: { key: IOS_VERSION_KEY, value: v },
      update: { value: v },
    });
    return { version: v };
  }
}
