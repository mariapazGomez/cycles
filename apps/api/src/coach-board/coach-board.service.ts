import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { addDays, calendarWeekStart } from "../common/training";
import { EventsService } from "../events/events.service";
import { parseRange } from "../events/recurrence";
import { PrismaService } from "../prisma/prisma.service";
import { weekClauses, weeksStartingBetween, weeksTouching } from "./week-range";

// Consultas agrupadas del coach (CYC-325): una petición trae lo de todos sus atletas, así Inicio,
// Atletas y el calendario del equipo no piden más cuanto más atletas o ciclos tienen. La lista de
// atletas la arma siempre el servidor (relación activa, R5): quien llama no elige ids de atletas.
export const BOARD_LIMITS = {
  // Tramo de sesiones: alcanza para un mes completo o las cuatro semanas de Atletas.
  maxDays: 62,
  sessionsPerPage: 2000,
  athletesPerPage: 100,
} as const;

const DAY_MS = 86_400_000;
const dayStart = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const dayEnd = (iso: string) => new Date(`${iso}T23:59:59.999Z`);

const CYCLE_SELECT = {
  id: true,
  athleteId: true,
  name: true,
  startDate: true,
  endDate: true,
  sessionsPerWeek: true,
  teamCycleId: true,
  parentCycleId: true,
} satisfies Prisma.TrainingCycleSelect;

const plannedSets = (exercises: { targetSets: number }[]) => exercises.reduce((n, e) => n + e.targetSets, 0);

@Injectable()
export class CoachBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  // Atletas con relación activa, ordenados por id; con equipo, solo sus integrantes. Un equipo de
  // otro coach responde 404: no se revela que existe.
  private async activeAthletes(coachId: string, options: { teamId?: string; cursor?: string; take?: number } = {}): Promise<string[]> {
    if (options.teamId !== undefined) {
      const team = await this.prisma.team.findFirst({ where: { id: options.teamId, coachId }, select: { id: true } });
      if (!team) throw new NotFoundException("Equipo no encontrado.");
    }
    const rows = await this.prisma.coachAthlete.findMany({
      where: {
        coachId,
        status: "active",
        ...(options.cursor ? { athleteId: { gt: options.cursor } } : {}),
        ...(options.teamId ? { athlete: { teamMemberships: { some: { teamId: options.teamId } } } } : {}),
      },
      select: { athleteId: true },
      orderBy: { athleteId: "asc" },
      ...(options.take ? { take: options.take } : {}),
    });
    return rows.map((r) => r.athleteId);
  }

  private async athletePage(coachId: string, cursor?: string) {
    const ids = await this.activeAthletes(coachId, { cursor, take: BOARD_LIMITS.athletesPerPage + 1 });
    const page = ids.slice(0, BOARD_LIMITS.athletesPerPage);
    return { page, nextCursor: ids.length > page.length ? page[page.length - 1] : null };
  }

  // Sesiones de los ciclos que se cruzan con el tramo: los activos de cada atleta y, dentro de un
  // macrociclo activo, los que no estén archivados. Llegan las de las semanas del plan que tocan el
  // tramo y las que tienen día elegido dentro de él; la web calcula el día de cada una.
  async sessions(coachId: string, query: { from: string; to: string; teamId?: string; volumes?: string; cursor?: string }) {
    const { from, to } = parseRange(query.from, query.to);
    if ((dayStart(to).getTime() - dayStart(from).getTime()) / DAY_MS + 1 > BOARD_LIMITS.maxDays) {
      throw new BadRequestException(`El rango puede abarcar como máximo ${BOARD_LIMITS.maxDays} días.`);
    }
    const volumes = query.volumes === "true";
    const athleteIds = await this.activeAthletes(coachId, { teamId: query.teamId });
    const cycles = await this.prisma.trainingCycle.findMany({
      where: {
        coachId,
        athleteId: { in: athleteIds },
        isTemplate: false,
        cycleType: { not: "macrocycle" },
        startDate: { lte: dayEnd(to) },
        endDate: { gte: dayStart(from) },
        OR: [
          { parentCycleId: null, status: "active" },
          { status: { not: "archived" }, parentCycle: { coachId, status: "active", cycleType: "macrocycle" } },
        ],
      },
      select: CYCLE_SELECT,
      // El mismo orden que la lista de ciclos: así las sesiones de un día salen como antes.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    if (cycles.length === 0) return { cycles: [], sessions: [], nextCursor: null };

    const rows = await this.prisma.trainingSession.findMany({
      where: {
        deletedAt: null,
        OR: [
          { cycleId: { in: cycles.map((c) => c.id) }, scheduledDate: { gte: dayStart(from), lte: dayEnd(to) } },
          ...weekClauses(cycles, (c) => weeksTouching(c.startDate, dayStart(from), dayStart(to))),
        ],
        ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      },
      select: {
        id: true,
        cycleId: true,
        name: true,
        weekNumber: true,
        slotNumber: true,
        scheduledDate: true,
        status: true,
        teamSessionId: true,
        ...(volumes ? { sessionExercises: { select: { targetSets: true } } } : {}),
      },
      orderBy: { id: "asc" },
      take: BOARD_LIMITS.sessionsPerPage + 1,
    });
    const page = rows.slice(0, BOARD_LIMITS.sessionsPerPage);
    const sessions = page.map((row) => {
      const { sessionExercises, ...session } = row as typeof row & { sessionExercises?: { targetSets: number }[] };
      return volumes ? { ...session, plannedSets: plannedSets(sessionExercises ?? []) } : session;
    });
    const nextCursor = rows.length > page.length ? page[page.length - 1].id : null;
    // Los ciclos van solo en la primera página.
    if (query.cursor) return { cycles: [], sessions, nextCursor };
    if (!volumes) return { cycles, sessions, nextCursor };

    // «Volumen alto» es el tercio más alto de TODO el ciclo, no solo de lo que se ve: van las series
    // de cada sesión con día, sin nada más de ellas.
    const dated = await this.prisma.trainingSession.findMany({
      where: { cycleId: { in: cycles.map((c) => c.id) }, deletedAt: null, scheduledDate: { not: null } },
      select: { cycleId: true, sessionExercises: { select: { targetSets: true } } },
    });
    const byCycle = new Map<string, number[]>();
    for (const s of dated) byCycle.set(s.cycleId, [...(byCycle.get(s.cycleId) ?? []), plannedSets(s.sessionExercises)]);
    return { cycles: cycles.map((c) => ({ ...c, datedVolumes: byCycle.get(c.id) ?? [] })), sessions, nextCursor };
  }

  // Actividades de los atletas en el tramo, sin sus notas (R7).
  async athleteEvents(coachId: string, query: { from: string; to: string; cursor?: string }) {
    const { from, to } = parseRange(query.from, query.to);
    const { page, nextCursor } = await this.athletePage(coachId, query.cursor);
    return { events: await this.events.listForAthletes(coachId, page, from, to), nextCursor };
  }

  // Sesiones asignadas y completadas de las últimas semanas, con la misma cuenta que el resumen de
  // cada atleta (todos sus ciclos con este coach; la semana en que estaba planificada).
  async adherence(coachId: string, query: { weeks?: number; cursor?: string }) {
    const weeks = query.weeks ?? 4;
    const firstMonday = addDays(calendarWeekStart(new Date()), -(weeks - 1) * 7);
    const lastSunday = addDays(firstMonday, weeks * 7 - 1);
    const { page, nextCursor } = await this.athletePage(coachId, query.cursor);
    const cycles = await this.prisma.trainingCycle.findMany({
      where: { coachId, athleteId: { in: page }, cycleType: { not: "macrocycle" } },
      select: { id: true, athleteId: true, startDate: true },
    });
    const clauses = weekClauses(cycles, (c) => weeksStartingBetween(c.startDate, firstMonday, lastSunday));
    const counts = clauses.length
      ? await this.prisma.trainingSession.groupBy({ by: ["cycleId", "status"], where: { deletedAt: null, OR: clauses }, _count: { _all: true } })
      : [];
    const athleteOf = new Map(cycles.map((c) => [c.id, c.athleteId!]));
    const totals = new Map(page.map((id) => [id, { athleteId: id, assigned: 0, completed: 0 }]));
    for (const row of counts) {
      const total = totals.get(athleteOf.get(row.cycleId)!)!;
      total.assigned += row._count._all;
      if (row.status === "completed") total.completed += row._count._all;
    }
    return { athletes: [...totals.values()], nextCursor };
  }
}
