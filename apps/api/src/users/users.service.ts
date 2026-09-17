import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authProvider: user.authProvider,
      weightUnit: user.weightUnit,
      emailVerified: Boolean(user.emailVerifiedAt),
      dataConsentAt: user.dataConsentAt,
      createdAt: user.createdAt,
    };
  }
}
