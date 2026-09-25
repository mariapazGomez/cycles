import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CURRENT_ONLY,
  addDays,
  calendarWeekStart,
  estimateOneRepMax,
  planWeekAt,
  planWeekStart,
  roundToHalfKg,
} from "../common/training";
import {
  CONSECUTIVE_SESSIONS,
  ExerciseExecution,
  HIGH_LOAD_PERCENT,
  LOW_LOAD_PERCENT,
  PAIN_WINDOW_DAYS,
  SKIPPED_THRESHOLD,
  SKIPPED_WINDOW_DAYS,
  effortVerdict,
  reportedRir,
  rirDeviation,
} from "./rules";
import { CreateLoadAdjustmentDto } from "./dto/create-load-adjustment.dto";

// Un plan con todo lo necesario para calcular seguimiento: sesiones, su cierre
// vigente, y por ejercicio los objetivos y las series vigentes.
const CYCLE_WITH_EXECUTION = {
  sessions: {
    orderBy: [{ weekNumber: "asc" as const }, { slotNumber: "asc" as const }],
    include: {
      feedback: { where: CURRENT_ONLY },
      sessionExercises: {
        orderBy: { orderIndex: "asc" as const },
        include: {
          exercise: true,
          logs: { where: CURRENT_ONLY, orderBy: { setNumber: "asc" as const } },
        },
      },
    },
  },
} satisfies Prisma.TrainingCycleInclude;

type CycleWithExecution = Prisma.TrainingCycleGetPayload<{ include: typeof CYCLE_WITH_EXECUTION }>;
type SessionWithExecution = CycleWithExecution["sessions"][number];

export type AttentionKind = "pain" | "high_load" | "low_adherence" | "low_load";
const KIND_ORDER: AttentionKind[] = ["pain", "high_load", "low_adherence", "low_load"];

export interface AttentionItem {
  kind: AttentionKind;
  athlete: { id: string; name: string };
  cycle: { id: string; name: string };
  exercise: { id: string; name: string } | null;
  sessionId: string | null;
  message: string;
  suggestion: { exerciseId: string; fromWeek: number; percentChange: number; reason: string } | null;
}

// Seguimiento del coach sobre la ejecución de sus atletas — ver
// docs/prds/features/PRD-EjecucionYSeguimiento.md, secciones 6 y 7.
@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async attention(coachId: string): Promise<AttentionItem[]> {
    const now = new Date();
    const relations = await this.prisma.coachAthlete.findMany({
      where: { coachId, status: "active" },
      include: { athlete: { select: { id: true, name: true } } },
    });
    if (relations.length === 0) {
      return [];
    }

    const cycles = await this.prisma.trainingCycle.findMany({
      where: {
        coachId,
        athleteId: { in: relations.map((r) => r.athleteId) },
        status: "active",
        cycleType: { not: "macrocycle" },
      },
      include: CYCLE_WITH_EXECUTION,
    });
    const adjustments = await this.prisma.loadAdjustment.findMany({
      where: { cycleId: { in: cycles.map((c) => c.id) } },
      orderBy: { createdAt: "desc" },
    });
    const athleteById = new Map(relations.map((r) => [r.athleteId, r.athlete]));

    const items: AttentionItem[] = [];
    for (const cycle of cycles) {
      const athlete = athleteById.get(cycle.athleteId)!;
      const ref = { id: cycle.id, name: cycle.name };
      const currentWeek = planWeekAt(cycle.startDate, now);

      // Dolor reportado en los últimos días.
      for (const session of cycle.sessions) {
        const fb = session.feedback[0];
        if (fb?.pain && fb.submittedAt >= addDays(now, -PAIN_WINDOW_DAYS)) {
          items.push({
            kind: "pain",
            athlete,
            cycle: ref,
            exercise: null,
            sessionId: session.id,
            message: fb.painNotes
              ? `Reportó dolor en ${session.name} (semana ${session.weekNumber}): "${fb.painNotes}"`
              : `Reportó dolor en ${session.name} (semana ${session.weekNumber}).`,
            suggestion: null,
          });
        }
      }

      // Adherencia: sesiones de semanas ya terminadas sin cierre, u omisiones seguidas.
      const overdue = cycle.sessions.filter((s) => s.status === "pending" && s.weekNumber < currentWeek);
      const recentSkips = cycle.sessions.filter((s) => {
        const fb = s.feedback[0];
        return fb?.outcome === "skipped" && fb.submittedAt >= addDays(now, -SKIPPED_WINDOW_DAYS);
      });
      if (overdue.length > 0 || recentSkips.length >= SKIPPED_THRESHOLD) {
        const parts = [];
        if (overdue.length > 0) {
          parts.push(`${overdue.length} ${overdue.length === 1 ? "sesión" : "sesiones"} de semanas pasadas sin registrar`);
        }
        if (recentSkips.length >= SKIPPED_THRESHOLD) {
          parts.push(`${recentSkips.length} omitidas en los últimos ${SKIPPED_WINDOW_DAYS} días`);
        }
        items.push({
          kind: "low_adherence",
          athlete,
          cycle: ref,
          exercise: null,
          sessionId: null,
          message: `${capitalize(parts.join(" y "))}.`,
          suggestion: null,
        });
      }

      // Carga: esfuerzo real vs. objetivo en las últimas sesiones completadas de cada ejercicio.
      for (const [exerciseId, entries] of this.completedExecutionsByExercise(cycle)) {
        const recent = entries.filter((e) => effortVerdict(e.execution) !== "unknown").slice(-CONSECUTIVE_SESSIONS);
        if (recent.length < CONSECUTIVE_SESSIONS) {
          continue;
        }
        const verdicts = recent.map((e) => effortVerdict(e.execution));
        const kind = verdicts.every((v) => v === "hard")
          ? "high_load"
          : verdicts.every((v) => v === "easy")
            ? "low_load"
            : null;
        if (!kind) {
          continue;
        }

        // Si el coach ya ajustó este ejercicio después de esas sesiones, la alerta está atendida.
        const lastSeen = recent[recent.length - 1].submittedAt;
        const handled = adjustments.some(
          (a) => a.cycleId === cycle.id && a.exerciseId === exerciseId && a.createdAt > lastSeen,
        );
        if (handled) {
          continue;
        }

        const exercise = recent[0].exercise;
        const target = recent[recent.length - 1].execution.targetRir!;
        const reported = recent.map((e) => formatRir(reportedRir(e.execution.logs)));
        const fromWeek = this.firstPendingWeek(cycle, exerciseId, currentWeek);
        const percentChange = kind === "high_load" ? HIGH_LOAD_PERCENT : LOW_LOAD_PERCENT;
        items.push({
          kind,
          athlete,
          cycle: ref,
          exercise: { id: exercise.id, name: exercise.name },
          sessionId: null,
          message:
            kind === "high_load"
              ? `${exercise.name}: le costó más de lo planificado en las ${CONSECUTIVE_SESSIONS} últimas sesiones (reps en reserva ${reported.join(" y ")}, objetivo ${target}).`
              : `${exercise.name}: le sobró margen en las ${CONSECUTIVE_SESSIONS} últimas sesiones (reps en reserva ${reported.join(" y ")}, objetivo ${target}).`,
          suggestion: fromWeek === null ? null : { exerciseId, fromWeek, percentChange, reason: kind },
        });
      }
    }

    return items.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }

  async athleteSummary(coachId: string, athleteId: string, weeks = 6) {
    const relation = await this.assertActiveRelation(coachId, athleteId);
    const now = new Date();
    const firstWeek = addDays(calendarWeekStart(now), -(weeks - 1) * 7);

    const cycles = await this.prisma.trainingCycle.findMany({
      where: { coachId, athleteId, cycleType: { not: "macrocycle" } },
      include: CYCLE_WITH_EXECUTION,
    });

    const buckets = Array.from({ length: weeks }, (_, i) => ({
      weekStart: addDays(firstWeek, i * 7),
      assigned: 0,
      completed: 0,
      skipped: 0,
      load: 0,
    }));
    const bucketFor = (date: Date) =>
      buckets.find((b) => b.weekStart.getTime() === calendarWeekStart(date).getTime());

    const exercises = new Map<
      string,
      { id: string; name: string; e1rmByWeek: Map<number, number>; deviations: number[]; lastTargetRir: number | null; lastRir: number | null }
    >();

    for (const cycle of cycles) {
      for (const session of cycle.sessions) {
        const planned = bucketFor(planWeekStart(cycle.startDate, session.weekNumber));
        if (planned) {
          planned.assigned += 1;
          if (session.status === "completed") planned.completed += 1;
          if (session.status === "skipped") planned.skipped += 1;
        }
        const fb = session.feedback[0];
        if (fb?.outcome === "completed" && fb.srpe !== null && fb.durationMinutes !== null) {
          const done = bucketFor(fb.submittedAt);
          if (done) done.load += fb.srpe * fb.durationMinutes;
        }
      }

      for (const [exerciseId, entries] of this.completedExecutionsByExercise(cycle)) {
        const summary = exercises.get(exerciseId) ?? {
          id: exerciseId,
          name: entries[0].exercise.name,
          e1rmByWeek: new Map<number, number>(),
          deviations: [],
          lastTargetRir: null,
          lastRir: null,
        };
        for (const entry of entries) {
          for (const log of entry.execution.logs) {
            const bucket = bucketFor(entry.submittedAt);
            if (!bucket || log.actualWeight === null) continue;
            const e1rm = estimateOneRepMax(log.actualWeight, log.actualReps, log.rir);
            const key = bucket.weekStart.getTime();
            summary.e1rmByWeek.set(key, Math.max(summary.e1rmByWeek.get(key) ?? 0, e1rm));
          }
          const deviation = rirDeviation(entry.execution);
          if (deviation !== null) summary.deviations.push(deviation);
          summary.lastTargetRir = entry.execution.targetRir;
          // La última respuesta disponible: una sesión sin RIR reportado no la borra.
          summary.lastRir = reportedRir(entry.execution.logs) ?? summary.lastRir;
        }
        exercises.set(exerciseId, summary);
      }
    }

    return {
      athlete: { id: relation.athlete.id, name: relation.athlete.name },
      weeks: buckets.map((b) => ({ ...b, weekStart: b.weekStart.toISOString().slice(0, 10) })),
      exercises: [...exercises.values()]
        .map((e) => {
          const recent = e.deviations.slice(-4);
          return {
            exerciseId: e.id,
            name: e.name,
            e1rm: [...e.e1rmByWeek.entries()]
              .sort(([a], [b]) => a - b)
              .map(([week, value]) => ({ weekStart: new Date(week).toISOString().slice(0, 10), value: round1(value) })),
            // Promedio de las últimas 4 sesiones con dato; positivo = más duro de lo planificado.
            avgRirDeviation: recent.length ? round1(recent.reduce((s, d) => s + d, 0) / recent.length) : null,
            lastTargetRir: e.lastTargetRir,
            lastRir: e.lastRir,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    };
  }

  async cycleProgress(coachId: string, cycleId: string) {
    const cycle = await this.prisma.trainingCycle.findUnique({
      where: { id: cycleId },
      include: CYCLE_WITH_EXECUTION,
    });
    if (!cycle) {
      throw new NotFoundException("Plan no encontrado.");
    }
    if (cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de este plan.");
    }
    await this.assertActiveRelation(coachId, cycle.athleteId);

    return {
      cycle: { id: cycle.id, name: cycle.name, currentWeek: planWeekAt(cycle.startDate, new Date()) },
      sessions: cycle.sessions.map((session) => {
        const fb = session.feedback[0] ?? null;
        return {
          id: session.id,
          name: session.name,
          weekNumber: session.weekNumber,
          slotNumber: session.slotNumber,
          status: session.status,
          feedback: fb && {
            outcome: fb.outcome,
            srpe: fb.srpe,
            durationMinutes: fb.durationMinutes,
            pain: fb.pain,
            painNotes: fb.painNotes,
            notes: fb.notes,
            submittedAt: fb.submittedAt,
          },
          exercises: session.sessionExercises.map((se) => ({
            sessionExerciseId: se.id,
            exercise: { id: se.exercise.id, name: se.exercise.name },
            target: { sets: se.targetSets, reps: se.targetReps, weight: se.targetWeight, rir: se.targetRir },
            actual: {
              sets: se.logs.map((l) => ({ setNumber: l.setNumber, reps: l.actualReps, weight: l.actualWeight, rir: l.rir })),
              reportedRir: reportedRir(se.logs),
              verdict: effortVerdict(this.toExecution(se)),
            },
          })),
        };
      }),
    };
  }

  async createLoadAdjustment(coachId: string, cycleId: string, dto: CreateLoadAdjustmentDto) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException("Plan no encontrado.");
    }
    if (cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de este plan.");
    }
    await this.assertActiveRelation(coachId, cycle.athleteId);

    const targets = await this.prisma.sessionExercise.findMany({
      where: {
        exerciseId: dto.exerciseId,
        targetWeight: { not: null },
        session: { cycleId, status: "pending", weekNumber: { gte: dto.fromWeek } },
      },
    });
    if (targets.length === 0) {
      throw new BadRequestException(
        "No hay sesiones pendientes con peso objetivo para ese ejercicio desde esa semana.",
      );
    }

    const factor = 1 + dto.percentChange / 100;
    const [adjustment] = await this.prisma.$transaction([
      this.prisma.loadAdjustment.create({
        data: {
          coachId,
          cycleId,
          exerciseId: dto.exerciseId,
          fromWeek: dto.fromWeek,
          percentChange: dto.percentChange,
          reason: dto.reason ?? "manual",
          affectedCount: targets.length,
        },
      }),
      ...targets.map((se) =>
        this.prisma.sessionExercise.update({
          where: { id: se.id },
          data: { targetWeight: roundToHalfKg(se.targetWeight! * factor) },
        }),
      ),
    ]);
    return adjustment;
  }

  // Por ejercicio, sus ejecuciones en sesiones cerradas como completadas, en
  // orden cronológico del plan.
  private completedExecutionsByExercise(cycle: CycleWithExecution) {
    const byExercise = new Map<
      string,
      { exercise: SessionWithExecution["sessionExercises"][number]["exercise"]; submittedAt: Date; execution: ExerciseExecution }[]
    >();
    for (const session of cycle.sessions) {
      const fb = session.feedback[0];
      if (fb?.outcome !== "completed") continue;
      for (const se of session.sessionExercises) {
        const list = byExercise.get(se.exerciseId) ?? [];
        list.push({ exercise: se.exercise, submittedAt: fb.submittedAt, execution: this.toExecution(se) });
        byExercise.set(se.exerciseId, list);
      }
    }
    return byExercise;
  }

  private toExecution(se: SessionWithExecution["sessionExercises"][number]): ExerciseExecution {
    return {
      targetSets: se.targetSets,
      targetReps: se.targetReps,
      targetRir: se.targetRir,
      logs: se.logs.map((l) => ({
        setNumber: l.setNumber,
        actualReps: l.actualReps,
        actualWeight: l.actualWeight,
        rir: l.rir,
      })),
    };
  }

  // Primera semana, desde la actual en adelante, con una sesión pendiente que
  // tenga peso objetivo para ese ejercicio. Las atrasadas no se ajustan.
  private firstPendingWeek(cycle: CycleWithExecution, exerciseId: string, currentWeek: number): number | null {
    const weeks = cycle.sessions
      .filter(
        (s) =>
          s.status === "pending" &&
          s.weekNumber >= currentWeek &&
          s.sessionExercises.some((se) => se.exerciseId === exerciseId && se.targetWeight !== null),
      )
      .map((s) => s.weekNumber);
    return weeks.length ? Math.min(...weeks) : null;
  }

  // El coach pierde acceso a los datos del atleta cuando la relación deja de
  // estar activa (PRD general, sección 4).
  private async assertActiveRelation(coachId: string, athleteId: string) {
    const relation = await this.prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId } },
      include: { athlete: { select: { id: true, name: true } } },
    });
    if (!relation || relation.status !== "active") {
      throw new ForbiddenException("No tienes una relación activa con este atleta.");
    }
    return relation;
  }
}

function formatRir(rir: number | null): string {
  if (rir === null) return "sin dato";
  return rir >= 4 ? "4+" : String(rir);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
