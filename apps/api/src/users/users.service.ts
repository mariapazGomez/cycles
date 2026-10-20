import { Injectable, NotFoundException } from "@nestjs/common";
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authProvider: user.authProvider,
      weightUnit: user.weightUnit,
      emailVerified: Boolean(user.emailVerifiedAt),
      dataConsentAt: user.dataConsentAt,
      policyAcceptedAt: accepted?.acceptedAt ?? null,
      policyVersion: POLICY_VERSION,
      needsPolicyAcceptance: !accepted,
      createdAt: user.createdAt,
    };
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
