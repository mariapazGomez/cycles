import { Injectable, NotFoundException } from "@nestjs/common";
import { TourStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { POLICY_VERSION, policyAcceptanceData } from "../common/policy";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // ¿Aceptó la versión vigente de los Términos y la Política? Si no (cuenta
    // anterior a T-147 o versión nueva), la web le pide aceptar antes de seguir.
    const accepted = await this.prisma.policyAcceptance.findUnique({
      where: { userId_version: { userId: id, version: POLICY_VERSION } },
    });

    // Un atleta que se registró solo no tiene coach hasta que uno lo invita (CYC-187).
    const hasActiveCoach =
      user.role === "athlete"
        ? (await this.prisma.coachAthlete.count({ where: { athleteId: id, status: "active" } })) > 0
        : undefined;

    // ¿Tiene Apple vinculado? La app lo usa para pedir la confirmación de Apple al eliminar la cuenta.
    const hasAppleIdentity = (await this.prisma.userIdentity.count({ where: { userId: id, provider: "apple" } })) > 0;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasActiveCoach,
      hasAppleIdentity,
      authProvider: user.authProvider,
      weightUnit: user.weightUnit,
      phonePlatform: user.phonePlatform,
      tourStatus: user.tourStatus,
      emailVerified: Boolean(user.emailVerifiedAt),
      dataConsentAt: user.dataConsentAt,
      policyAcceptedAt: accepted?.acceptedAt ?? null,
      policyVersion: POLICY_VERSION,
      needsPolicyAcceptance: !accepted,
      createdAt: user.createdAt,
    };
  }

  // Guarda si la persona saltó o terminó la guía de primer uso (o la vuelve a abrir).
  async setTourStatus(id: string, tourStatus: TourStatus): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { tourStatus } });
  }

  // Quien ya tiene cuenta acepta la versión vigente desde la pantalla de
  // aceptación. Es idempotente: aceptar dos veces no crea otra fila.
  async acceptPolicy(id: string): Promise<void> {
    await this.prisma.policyAcceptance.upsert({
      where: { userId_version: { userId: id, version: POLICY_VERSION } },
      update: {},
      create: { userId: id, ...policyAcceptanceData("reaccept") },
    });
  }
}
