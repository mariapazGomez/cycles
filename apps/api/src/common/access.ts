import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Un coach solo accede a los datos de un atleta mientras la relación está
// activa; el atleta conserva siempre el acceso a lo suyo. Ver
// docs/SEGURIDAD.md, regla R5 y hallazgo S-05.

export async function hasActiveRelation(prisma: PrismaService, coachId: string, athleteId: string): Promise<boolean> {
  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
    select: { status: true },
  });
  return relation?.status === "active";
}

export async function assertActiveRelation(prisma: PrismaService, coachId: string, athleteId: string): Promise<void> {
  if (!(await hasActiveRelation(prisma, coachId, athleteId))) {
    throw new ForbiddenException("Ya no tienes una relación activa con este atleta.");
  }
}
