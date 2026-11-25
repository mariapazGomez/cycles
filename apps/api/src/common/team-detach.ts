import type { PrismaService } from "../prisma/prisma.service";

// Un cambio del coach en la sesión de una persona la separa del plan del equipo (CYC-314,
// POR CONFIRMAR 1): deja de recibir sus cambios. No hace nada en una sesión que no es copia.
export async function detachFromTeam(prisma: PrismaService, sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) return;
  await prisma.trainingSession.updateMany({
    where: { id: { in: sessionIds }, teamSessionId: { not: null }, detachedAt: null },
    data: { detachedAt: new Date() },
  });
}

// El contenido de una sesión, para saber si un guardado cambió algo (guardar sin cambios no separa).
export async function sessionFingerprint(prisma: PrismaService, sessionId: string): Promise<string> {
  const session = await prisma.trainingSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: {
      blocks: { orderBy: { orderIndex: "asc" }, select: { name: true, type: true, color: true, note: true } },
      sessionExercises: {
        orderBy: { orderIndex: "asc" },
        select: {
          exerciseId: true, targetSets: true, targetReps: true, targetWeight: true, targetPercentRm: true,
          targetRestSeconds: true, targetRir: true, note: true, block: { select: { orderIndex: true } },
        },
      },
    },
  });
  return JSON.stringify(session);
}

// Ejecuta una edición del coach y separa la copia solo si el contenido cambió.
export async function detachIfChanged<T>(prisma: PrismaService, session: { id: string; teamSessionId?: string | null }, edit: () => Promise<T>): Promise<T> {
  if (!session.teamSessionId) return edit();
  const before = await sessionFingerprint(prisma, session.id);
  const result = await edit();
  if ((await sessionFingerprint(prisma, session.id)) !== before) await detachFromTeam(prisma, [session.id]);
  return result;
}
