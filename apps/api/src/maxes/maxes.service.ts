import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { assertActiveRelation } from "../common/access";
import { CURRENT_LOG } from "../common/training";
import { ResolvedLoad, WeightUnitName, resolveLoad } from "../common/max";
import { RecordMaxDto } from "./dto/record-max.dto";

export interface CurrentMax {
  exerciseId: string;
  weightKg: number;
  measuredAt: Date;
  source: "coach" | "athlete" | "estimated";
}

interface PercentItem {
  exerciseId: string;
  targetPercentRm: number | null;
  frozenRmKg: number | null;
}

// RM del atleta por ejercicio (CYC-306). Solo se agrega: el RM vigente de un ejercicio es
// la fila de `measuredAt` más reciente (desempate por `createdAt`). Nunca se actualiza ni
// se borra una fila (salvo al eliminar la cuenta del atleta).
@Injectable()
export class MaxesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // RM vigente por ejercicio. Sin `exerciseIds`, todos los del atleta.
  async currentMaxes(athleteId: string, exerciseIds?: string[]): Promise<Map<string, CurrentMax>> {
    if (exerciseIds && exerciseIds.length === 0) return new Map();
    const rows = await this.prisma.athleteMax.findMany({
      where: { athleteId, ...(exerciseIds ? { exerciseId: { in: exerciseIds } } : {}) },
      orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
      distinct: ["exerciseId"],
    });
    return new Map(rows.map((r) => [r.exerciseId, { exerciseId: r.exerciseId, weightKg: r.weightKg, measuredAt: r.measuredAt, source: r.source }]));
  }

  // Rechaza guardar un % para un ejercicio en el que el atleta no tiene RM.
  async assertHasMax(athleteId: string, exerciseIds: string[]): Promise<void> {
    const ids = [...new Set(exerciseIds)];
    if (ids.length === 0) return;
    const maxes = await this.currentMaxes(athleteId, ids);
    const missing = ids.filter((id) => !maxes.has(id));
    if (missing.length === 0) return;
    const found = await this.prisma.exercise.findMany({ where: { id: { in: missing } }, select: { id: true, name: true } });
    throw new UnprocessableEntityException({
      statusCode: 422,
      message: `Este atleta no tiene RM en ${found.map((e) => `«${e.name}»`).join(", ")}. Registra su RM para planificar con % del RM.`,
      missing: found.map((e) => ({ exerciseId: e.id, name: e.name })),
    });
  }

  // Agrega `rmStatus` y `resolvedWeightKg` a los ejercicios de una sesión. El peso no se guarda: se resuelve aquí.
  async withResolvedLoads<T extends PercentItem>(
    items: T[],
    athleteId: string | null,
  ): Promise<Array<T & ResolvedLoad>> {
    const withPercent = items.filter((i) => i.targetPercentRm !== null);
    let maxes = new Map<string, CurrentMax>();
    let unit: WeightUnitName = "kg";
    if (athleteId && withPercent.length > 0) {
      maxes = await this.currentMaxes(athleteId, withPercent.map((i) => i.exerciseId));
      const athlete = await this.prisma.user.findUnique({ where: { id: athleteId }, select: { weightUnit: true } });
      unit = athlete?.weightUnit === "lb" ? "lb" : "kg";
    }
    return items.map((item) => ({
      ...item,
      ...resolveLoad({
        percent: item.targetPercentRm,
        hasAthlete: athleteId !== null,
        frozenRmKg: item.frozenRmKg,
        currentRmKg: maxes.get(item.exerciseId)?.weightKg ?? null,
        unit,
      }),
    }));
  }

  // Lista del atleta: ejercicios con RM vigente y ejercicios de sus planes que aún no lo tienen.
  async list(athleteId: string) {
    const [maxes, planned] = await Promise.all([
      this.currentMaxes(athleteId),
      this.prisma.sessionExercise.findMany({
        where: { session: { cycle: { athleteId, isTemplate: false }, deletedAt: null } },
        select: { exerciseId: true },
        distinct: ["exerciseId"],
      }),
    ]);
    const ids = [...new Set([...maxes.keys(), ...planned.map((p) => p.exerciseId)])];
    const exercises = await this.prisma.exercise.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, muscleGroup: true } });
    const byId = new Map(exercises.map((e) => [e.id, e]));
    // Máximo levantado en series (referencia de solo lectura; NO es el RM ni lo rellena): el mayor
    // peso vigente de cada ejercicio, con sus repeticiones y fecha.
    const lifted = ids.length === 0 ? [] : await this.prisma.$queryRaw<Array<{ exerciseId: string; weightKg: number; reps: number; loggedAt: Date }>>(Prisma.sql`
      SELECT DISTINCT ON (se."exerciseId") se."exerciseId" AS "exerciseId", l."actualWeight" AS "weightKg", l."actualReps" AS "reps", l."loggedAt" AS "loggedAt"
      FROM "ExerciseLog" l JOIN "SessionExercise" se ON se.id = l."sessionExerciseId"
      WHERE l."athleteId" = ${athleteId} AND l.active = 1 AND l."actualWeight" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "ExerciseLog" n WHERE n."supersedesId" = l.id)
        AND se."exerciseId" IN (${Prisma.join(ids)})
      ORDER BY se."exerciseId", l."actualWeight" DESC, l."loggedAt" DESC`);
    const liftedBy = new Map(lifted.map((l) => [l.exerciseId, { weightKg: l.weightKg, reps: l.reps, loggedAt: l.loggedAt }]));
    const shape = (id: string) => ({
      exerciseId: id,
      name: byId.get(id)?.name ?? "",
      muscleGroup: byId.get(id)?.muscleGroup ?? null,
      maxLifted: liftedBy.get(id) ?? null,
    });
    return {
      withMax: [...maxes.values()]
        .map((m) => ({ ...shape(m.exerciseId), weightKg: m.weightKg, measuredAt: m.measuredAt, source: m.source }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
      withoutMax: planned
        .map((p) => p.exerciseId)
        .filter((id) => !maxes.has(id))
        .map(shape)
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    };
  }

  // Vigente + historial de un ejercicio, y el máximo levantado en series como referencia aparte
  // (NO es el RM: no se usa para calcular nada).
  async detail(athleteId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId }, select: { id: true, name: true } });
    if (!exercise) throw new NotFoundException("Ejercicio no encontrado.");
    const [history, lifted] = await Promise.all([
      this.prisma.athleteMax.findMany({
        where: { athleteId, exerciseId },
        orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
        select: { id: true, weightKg: true, measuredAt: true, createdAt: true, source: true },
      }),
      this.prisma.exerciseLog.aggregate({
        where: { athleteId, sessionExercise: { exerciseId }, actualWeight: { not: null }, ...CURRENT_LOG },
        _max: { actualWeight: true },
      }),
    ]);
    return {
      exercise,
      current: history[0] ?? null,
      history,
      maxLiftedKg: lifted._max.actualWeight ?? null,
    };
  }

  // Un RM nuevo es una fila nueva. Solo lo escribe el coach (la escritura del atleta espera su aprobación).
  async record(coachId: string, athleteId: string, exerciseId: string, dto: RecordMaxDto) {
    await assertActiveRelation(this.prisma, coachId, athleteId);
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise || !(exercise.createdBy === null || exercise.createdBy === coachId)) {
      throw new NotFoundException("Ejercicio no encontrado.");
    }
    const now = new Date();
    const measuredAt = dto.measuredAt ? new Date(dto.measuredAt) : now;
    if (measuredAt.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      throw new BadRequestException("La fecha del RM no puede ser futura.");
    }
    const source = dto.source ?? "coach";
    if (dto.basedOnLogId) {
      if (source !== "estimated") throw new BadRequestException("Solo un RM aproximado se basa en una serie.");
      const log = await this.prisma.exerciseLog.findUnique({ where: { id: dto.basedOnLogId }, include: { sessionExercise: { select: { exerciseId: true } } } });
      if (!log || log.athleteId !== athleteId || log.sessionExercise.exerciseId !== exerciseId) {
        throw new BadRequestException("La serie indicada no es de este atleta y ejercicio.");
      }
    }
    const row = await this.prisma.athleteMax.create({
      data: { athleteId, exerciseId, weightKg: dto.weightKg, measuredAt, source, recordedById: coachId, basedOnLogId: dto.basedOnLogId },
      select: { id: true, weightKg: true, measuredAt: true, createdAt: true, source: true },
    });
    // Si había un aviso «falta el RM» para este atleta, se cierra o se actualiza.
    this.notifications.syncRmMissing(coachId, athleteId);
    return { exerciseId, ...row };
  }
}
