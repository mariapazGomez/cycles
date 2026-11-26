import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { startOfUtcDay } from "../common/training";
import { cleanNote } from "../common/exercise-note";
import { cleanBlocks } from "../common/work-blocks";
import { earliestAllowedDay, reassignSlots, weekOfDate } from "../sessions/slots";
import { CYCLE_DATE_MESSAGES, isValidRange, outsideError, renumberForStart, sessionsOutside, startDateError } from "../cycles/cycle-dates";
import type { SaveSessionStructureDto, SessionStructureExerciseDto } from "../sessions/dto/save-session-structure.dto";
import { addToSummary, emptySummary, rangesOverlap, removalFate, skipReason, TEAM_RULES, type CopyState, type PropagationSummary } from "./rules";
import type { AddTeamSessionDto, CreateTeamCycleDto, TeamCycleDatesDto, UpdateTeamCycleDto, UpdateTeamSessionDto } from "./dto/team-cycle.dto";

type Tx = Prisma.TransactionClient;

const copySessions = (tx: Tx, cycleId: string) =>
  tx.trainingSession.findMany({
    where: { cycleId },
    select: { id: true, weekNumber: true, slotNumber: true, scheduledDate: true, deletedAt: true, teamSessionId: true },
  });

const MASTER_INCLUDE = {
  blocks: { orderBy: { orderIndex: "asc" as const } },
  exercises: { orderBy: { orderIndex: "asc" as const }, include: { exercise: true } },
} satisfies Prisma.TeamSessionInclude;
type Master = Prisma.TeamSessionGetPayload<{ include: typeof MASTER_INCLUDE }>;

const COPY_INCLUDE = {
  cycle: { select: { id: true, athleteId: true, coachId: true, status: true, teamCycleId: true } },
  sessionExercises: { select: { id: true, teamSessionExerciseId: true, _count: { select: { logs: true } } } },
  _count: { select: { feedback: true } },
} satisfies Prisma.TrainingSessionInclude;
type Copy = Prisma.TrainingSessionGetPayload<{ include: typeof COPY_INCLUDE }>;

function stateOf(copy: Copy): CopyState {
  return {
    status: copy.status,
    scheduledDate: copy.scheduledDate,
    startedAt: copy.startedAt,
    detachedAt: copy.detachedAt,
    deletedAt: copy.deletedAt,
    logs: copy.sessionExercises.reduce((n, e) => n + e._count.logs, 0),
    feedback: copy._count.feedback,
  };
}

// Ciclo del equipo (CYC-314). El plan maestro vive en TeamCycle/TeamSession; cada integrante que lo
// recibe tiene un ciclo y sesiones normales enlazados. Un cambio del equipo se aplica a las copias
// que lo admiten (rules.ts); un cambio en la copia de una persona nunca vuelve al plan.
@Injectable()
export class TeamCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- acceso ---

  private async ownedTeam(coachId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, coachId } });
    if (!team) throw new NotFoundException("Equipo no encontrado.");
    return team;
  }

  // Un ciclo o una sesión de otro coach responde 404: no se revela que existe.
  private async ownedCycle(coachId: string, teamCycleId: string) {
    const cycle = await this.prisma.teamCycle.findFirst({ where: { id: teamCycleId, coachId } });
    if (!cycle) throw new NotFoundException("Ciclo del equipo no encontrado.");
    return cycle;
  }

  private async ownedSession(coachId: string, teamSessionId: string) {
    const session = await this.prisma.teamSession.findFirst({
      where: { id: teamSessionId, teamCycle: { coachId } },
      include: { teamCycle: true },
    });
    if (!session) throw new NotFoundException("Sesión del equipo no encontrada.");
    return session;
  }

  // El día local del coach (o el del servidor si no lo manda).
  private today(today?: string): Date {
    if (today === undefined) return startOfUtcDay(new Date());
    const day = earliestAllowedDay(new Date(), today);
    if (!day) throw new BadRequestException(CYCLE_DATE_MESSAGES.badToday);
    return day;
  }

  private async teamMembers(coachId: string, teamId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { athlete: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    const relations = await this.prisma.coachAthlete.findMany({
      where: { coachId, athleteId: { in: members.map((m) => m.athleteId) } },
      select: { athleteId: true, status: true },
    });
    const statusOf = new Map(relations.map((r) => [r.athleteId, r.status]));
    return members.map((m) => ({ id: m.athleteId, name: m.athlete.name, status: statusOf.get(m.athleteId) ?? ("inactive" as const) }));
  }

  private async assertDatesFree(teamId: string, range: { startDate: Date; endDate: Date }, exceptId?: string) {
    if (!TEAM_RULES.oneCyclePerDates) return;
    const others = await this.prisma.teamCycle.findMany({
      where: { teamId, status: "active", ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { startDate: true, endDate: true },
    });
    if (others.some((o) => rangesOverlap(o, range))) {
      throw new ConflictException("El equipo ya tiene un ciclo en esas fechas.");
    }
  }

  private range(dto: { startDate: string; endDate: string }) {
    const range = { startDate: startOfUtcDay(new Date(dto.startDate)), endDate: startOfUtcDay(new Date(dto.endDate)) };
    if (!isValidRange(range.startDate, range.endDate)) throw new BadRequestException(CYCLE_DATE_MESSAGES.endNotAfterStart);
    return range;
  }

  // --- crear y leer ---

  // «Quién lo recibe»: por persona, si ya tiene un ciclo propio en esas fechas (conviven; el coach
  // decide) y si su invitación sigue pendiente (no se le crea: se agrega a mano cuando acepta).
  async preview(coachId: string, teamId: string, dto: TeamCycleDatesDto) {
    await this.ownedTeam(coachId, teamId);
    const range = this.range(dto);
    const members = await this.teamMembers(coachId, teamId);
    const own = await this.prisma.trainingCycle.findMany({
      where: { athleteId: { in: members.map((m) => m.id) }, coachId, isTemplate: false, status: "active", cycleType: { not: "macrocycle" } },
      select: { id: true, athleteId: true, name: true, startDate: true, endDate: true },
    });
    const teamCycles = await this.prisma.teamCycle.findMany({ where: { teamId, status: "active" }, select: { id: true, name: true, startDate: true, endDate: true } });
    return {
      teamOverlap: teamCycles.filter((c) => rangesOverlap(c, range)),
      members: members
        .filter((m) => m.status !== "inactive")
        .map((m) => ({
          id: m.id,
          name: m.name,
          canReceive: m.status === "active",
          reason: m.status === "pending" ? "pending_invitation" : null,
          ownCycles: own.filter((c) => c.athleteId === m.id && rangesOverlap(c, range)).map(({ athleteId: _, ...c }) => c),
        })),
    };
  }

  private async assertCanReceive(coachId: string, teamId: string, athleteIds: string[]) {
    const ids = [...new Set(athleteIds)];
    const members = new Map((await this.teamMembers(coachId, teamId)).map((m) => [m.id, m]));
    for (const id of ids) {
      const member = members.get(id);
      if (!member) throw new BadRequestException("Uno o más atletas no están en el equipo.");
      if (member.status !== "active") throw new BadRequestException(`${member.name} todavía no acepta su invitación.`);
    }
    return ids;
  }

  async create(coachId: string, teamId: string, dto: CreateTeamCycleDto) {
    await this.ownedTeam(coachId, teamId);
    const range = this.range(dto);
    const startError = startDateError(range.startDate, dto.today);
    if (startError) throw new BadRequestException(startError);
    await this.assertDatesFree(teamId, range);
    const athleteIds = await this.assertCanReceive(coachId, teamId, dto.athleteIds);

    const id = await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.teamCycle.create({ data: { teamId, coachId, name: dto.name, objective: dto.objective, ...range } });
      for (const athleteId of athleteIds) await this.createCopyCycle(tx, cycle, athleteId);
      return cycle.id;
    });
    return this.detail(coachId, id);
  }

  private createCopyCycle(tx: Tx, cycle: { id: string; coachId: string; name: string; objective: string | null; startDate: Date; endDate: Date }, athleteId: string) {
    // Conserva el inicio del equipo (decisión de la usuaria): así las semanas son iguales para todos.
    return tx.trainingCycle.create({
      data: {
        coachId: cycle.coachId,
        athleteId,
        name: cycle.name,
        objective: cycle.objective,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        teamCycleId: cycle.id,
      },
    });
  }

  async list(coachId: string, teamId: string) {
    await this.ownedTeam(coachId, teamId);
    return this.prisma.teamCycle.findMany({
      where: { teamId },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { sessions: true, copies: true } } },
    });
  }

  // El plan con sus sesiones. Las cifras por sesión salen de las copias (el plan no tiene atleta).
  async detail(coachId: string, teamCycleId: string) {
    const cycle = await this.ownedCycle(coachId, teamCycleId);
    const [sessions, copies, copySessions] = await Promise.all([
      this.prisma.teamSession.findMany({ where: { teamCycleId }, include: MASTER_INCLUDE, orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }] }),
      this.prisma.trainingCycle.findMany({ where: { teamCycleId }, select: { id: true, athleteId: true, status: true, athlete: { select: { name: true } } } }),
      this.prisma.trainingSession.findMany({
        where: { teamSession: { teamCycleId }, deletedAt: null },
        select: { id: true, teamSessionId: true, status: true, detachedAt: true, cycle: { select: { athleteId: true, teamCycleId: true } } },
      }),
    ]);
    const current = new Set(copies.map((c) => c.athleteId!));
    const counted = copySessions.filter((c) => this.stillCounts(c, current));
    return {
      id: cycle.id,
      teamId: cycle.teamId,
      name: cycle.name,
      objective: cycle.objective,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      athletes: copies.map((c) => ({ athleteId: c.athleteId, name: c.athlete?.name ?? "", cycleId: c.id, status: c.status })),
      sessions: sessions.map((s) => {
        const own = counted.filter((c) => c.teamSessionId === s.id);
        return {
          ...s,
          recipients: own.length,
          completed: own.filter((c) => c.status === "completed").length,
          adjusted: own.filter((c) => c.detachedAt).length,
          copies: own.map((c) => ({ sessionId: c.id, athleteId: c.cycle.athleteId, status: c.status, adjusted: c.detachedAt !== null })),
        };
      }),
    };
  }

  // --- copias ---

  private async nextSlot(tx: Tx, cycleId: string, weekNumber: number): Promise<number> {
    const last = await tx.trainingSession.findFirst({ where: { cycleId, weekNumber }, orderBy: { slotNumber: "desc" }, select: { slotNumber: true } });
    return (last?.slotNumber ?? 0) + 1;
  }

  // La app ordena por (semana, espacio): los espacios siguen el orden de las fechas.
  private async reorderWeek(tx: Tx, cycleId: string, weekNumber: number) {
    const rows = await tx.trainingSession.findMany({ where: { cycleId, weekNumber }, select: { id: true, slotNumber: true, scheduledDate: true } });
    const changes = reassignSlots(rows);
    for (const id of changes.keys()) await tx.trainingSession.update({ where: { id }, data: { slotNumber: -rows.find((r) => r.id === id)!.slotNumber } });
    for (const [id, slotNumber] of changes) await tx.trainingSession.update({ where: { id }, data: { slotNumber } });
  }

  private exerciseData(e: Master["exercises"][number], blockId: string | null) {
    return {
      exerciseId: e.exerciseId,
      orderIndex: e.orderIndex,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetWeight: e.targetWeight,
      targetPercentRm: e.targetPercentRm,
      targetRestSeconds: e.targetRestSeconds,
      targetRir: e.targetRir,
      note: e.note,
      blockId,
    };
  }

  private async createCopySession(tx: Tx, cycle: { id: string; startDate: Date }, master: Master): Promise<string> {
    const weekNumber = weekOfDate(cycle.startDate, master.scheduledDate);
    const blockIdOf = new Map(master.blocks.map((b) => [b.id, randomUUID()]));
    const session = await tx.trainingSession.create({
      data: {
        cycleId: cycle.id,
        name: master.name,
        weekNumber,
        slotNumber: await this.nextSlot(tx, cycle.id, weekNumber),
        scheduledDate: master.scheduledDate,
        routineId: master.routineId,
        teamSessionId: master.id,
        blocks: { create: master.blocks.map((b) => ({ id: blockIdOf.get(b.id)!, name: b.name, type: b.type, color: b.color, orderIndex: b.orderIndex, note: b.note })) },
      },
      select: { id: true },
    });
    for (const e of master.exercises) {
      await tx.sessionExercise.create({
        data: { ...this.exerciseData(e, e.blockId ? blockIdOf.get(e.blockId)! : null), sessionId: session.id, teamSessionExerciseId: e.id },
      });
    }
    await this.reorderWeek(tx, cycle.id, weekNumber);
    return session.id;
  }

  // Quien salió del equipo ya no cuenta: sus sesiones conservadas quedan en un ciclo propio. Si
  // volvió a entrar, lo que conservó vuelve a contar (por eso no recibió una copia repetida).
  private stillCounts(copy: { deletedAt?: Date | null; cycle: { athleteId: string | null; teamCycleId: string | null } }, current: Set<string>): boolean {
    return copy.cycle.teamCycleId !== null || (!copy.deletedAt && current.has(copy.cycle.athleteId!));
  }

  private async currentAthletes(db: Tx | PrismaService, teamCycleId: string): Promise<Set<string>> {
    const cycles = await db.trainingCycle.findMany({ where: { teamCycleId }, select: { athleteId: true } });
    return new Set(cycles.map((c) => c.athleteId!));
  }

  // Las copias vivas de una sesión del equipo, con sus filas bloqueadas hasta terminar la
  // transacción: así nadie empieza ni registra mientras se decide si reciben el cambio.
  private async lockedCopies(tx: Tx, teamSessionId: string): Promise<Copy[]> {
    await tx.$queryRaw`SELECT id FROM "TrainingSession" WHERE "teamSessionId" = ${teamSessionId} FOR UPDATE`;
    await tx.$queryRaw`SELECT se.id FROM "SessionExercise" se JOIN "TrainingSession" s ON s.id = se."sessionId" WHERE s."teamSessionId" = ${teamSessionId} FOR UPDATE OF se`;
    return tx.trainingSession.findMany({ where: { teamSessionId }, include: COPY_INCLUDE });
  }

  // Deja la copia igual al plan, actualizando los ejercicios en su lugar (no cambian los ids que la
  // app del atleta ya tiene abiertos).
  private async syncCopy(tx: Tx, copy: Copy, master: Master) {
    const week = await tx.trainingCycle.findUniqueOrThrow({ where: { id: copy.cycleId }, select: { startDate: true } });
    const weekNumber = weekOfDate(week.startDate, master.scheduledDate);
    const moved = weekNumber !== copy.weekNumber;
    await tx.trainingSession.update({
      where: { id: copy.id },
      data: { name: master.name, scheduledDate: master.scheduledDate, ...(moved ? { weekNumber, slotNumber: await this.nextSlot(tx, copy.cycleId, weekNumber) } : {}) },
    });
    await this.reorderWeek(tx, copy.cycleId, weekNumber);

    const masterIds = new Set(master.exercises.map((e) => e.id));
    const bySource = new Map(copy.sessionExercises.filter((e) => e.teamSessionExerciseId && masterIds.has(e.teamSessionExerciseId)).map((e) => [e.teamSessionExerciseId!, e.id]));
    const keep = new Set(bySource.values());
    await tx.sessionExercise.deleteMany({ where: { sessionId: copy.id, id: { notIn: [...keep] } } });
    await tx.sessionBlock.deleteMany({ where: { sessionId: copy.id } });
    const blockIdOf = new Map<string, string>();
    for (const b of master.blocks) {
      const created = await tx.sessionBlock.create({ data: { sessionId: copy.id, name: b.name, type: b.type, color: b.color, orderIndex: b.orderIndex, note: b.note } });
      blockIdOf.set(b.id, created.id);
    }
    for (const e of master.exercises) {
      const data = this.exerciseData(e, e.blockId ? blockIdOf.get(e.blockId)! : null);
      const existing = bySource.get(e.id);
      if (existing) await tx.sessionExercise.update({ where: { id: existing }, data });
      else await tx.sessionExercise.create({ data: { ...data, sessionId: copy.id, teamSessionExerciseId: e.id } });
    }
  }

  private async propagate(tx: Tx, teamSessionId: string, today: Date, summary: PropagationSummary, changed: { id: string; athleteId: string }[]) {
    const master = await tx.teamSession.findUniqueOrThrow({ where: { id: teamSessionId }, include: MASTER_INCLUDE });
    const current = await this.currentAthletes(tx, master.teamCycleId);
    for (const copy of await this.lockedCopies(tx, teamSessionId)) {
      if (!this.stillCounts(copy, current)) continue;
      const reason = skipReason(stateOf(copy), today);
      addToSummary(summary, reason);
      if (reason) continue;
      await this.syncCopy(tx, copy, master);
      changed.push({ id: copy.id, athleteId: copy.cycle.athleteId! });
    }
  }

  private announce(coachId: string, changed: { id: string; athleteId: string }[], kind: "added" | "changed", hasPercent: boolean) {
    for (const c of changed) this.notifications.coachEditedSession(c.id, kind);
    if (hasPercent) for (const athleteId of new Set(changed.map((c) => c.athleteId))) this.notifications.syncRmMissing(coachId, athleteId);
  }

  // --- sesiones del plan ---

  private assertDayInCycle(cycle: { startDate: Date; endDate: Date }, day: Date, today: Date) {
    if (day < today) throw new BadRequestException("Solo puedes poner sesiones desde hoy.");
    if (day < startOfUtcDay(cycle.startDate) || day > startOfUtcDay(cycle.endDate)) {
      throw new BadRequestException("Ese día está fuera del ciclo.");
    }
  }

  async addSession(coachId: string, teamCycleId: string, dto: AddTeamSessionDto) {
    const cycle = await this.ownedCycle(coachId, teamCycleId);
    const today = this.today(dto.today);
    const day = startOfUtcDay(new Date(dto.scheduledDate));
    this.assertDayInCycle(cycle, day, today);
    const routine = await this.prisma.routine.findUnique({ where: { id: dto.routineId }, include: { routineExercises: true, blocks: true } });
    if (!routine || routine.coachId !== coachId) throw new BadRequestException("La rutina elegida no está disponible.");

    const changed: { id: string; athleteId: string }[] = [];
    const id = await this.prisma.$transaction(async (tx) => {
      const blockIdOf = new Map(routine.blocks.map((b) => [b.id, randomUUID()]));
      const created = await tx.teamSession.create({
        data: {
          teamCycleId,
          name: routine.name,
          scheduledDate: day,
          routineId: routine.id,
          blocks: { create: routine.blocks.map((b) => ({ id: blockIdOf.get(b.id)!, name: b.name, type: b.type, color: b.color, orderIndex: b.orderIndex, note: b.note })) },
        },
        select: { id: true },
      });
      for (const re of routine.routineExercises) {
        await tx.teamSessionExercise.create({
          data: {
            teamSessionId: created.id,
            exerciseId: re.exerciseId,
            orderIndex: re.orderIndex,
            targetSets: re.defaultSets,
            targetReps: re.defaultReps,
            targetWeight: re.defaultWeight,
            targetPercentRm: re.defaultPercentRm,
            targetRestSeconds: re.defaultRestSeconds,
            targetRir: re.defaultRir,
            note: re.note,
            blockId: re.blockId ? (blockIdOf.get(re.blockId) ?? null) : null,
          },
        });
      }
      const master = await tx.teamSession.findUniqueOrThrow({ where: { id: created.id }, include: MASTER_INCLUDE });
      const copies = await tx.trainingCycle.findMany({
        where: { teamCycleId, status: "active", athlete: { athleteRelations: { some: { coachId, status: "active" } } } },
        select: { id: true, startDate: true, athleteId: true },
      });
      for (const copy of copies) changed.push({ id: await this.createCopySession(tx, copy, master), athleteId: copy.athleteId! });
      return created.id;
    });
    this.announce(coachId, changed, "added", routine.routineExercises.some((r) => r.defaultPercentRm != null));
    return { sessionId: id, delivered: changed.length };
  }

  async updateSession(coachId: string, teamSessionId: string, dto: UpdateTeamSessionDto) {
    const session = await this.ownedSession(coachId, teamSessionId);
    const today = this.today(dto.today);
    const day = dto.scheduledDate ? startOfUtcDay(new Date(dto.scheduledDate)) : null;
    const moved = day !== null && day.getTime() !== startOfUtcDay(session.scheduledDate).getTime();
    if (moved) this.assertDayInCycle(session.teamCycle, day!, today);

    const summary = emptySummary();
    const changed: { id: string; athleteId: string }[] = [];
    if (dto.name !== undefined && dto.name !== session.name || moved) {
      await this.prisma.$transaction(async (tx) => {
        await tx.teamSession.update({ where: { id: teamSessionId }, data: { ...(dto.name !== undefined ? { name: dto.name } : {}), ...(moved ? { scheduledDate: day! } : {}) } });
        await this.propagate(tx, teamSessionId, today, summary, changed);
      });
    }
    this.announce(coachId, changed, "changed", false);
    return summary;
  }

  async saveStructure(coachId: string, teamSessionId: string, dto: SaveSessionStructureDto, todayInput?: string) {
    await this.ownedSession(coachId, teamSessionId);
    const today = this.today(todayInput);
    const blocks = dto.blocks ?? [];
    const loose = dto.exercises ?? [];
    const cleaned = cleanBlocks(blocks, loose.length);
    const incoming = [...blocks.flatMap((b) => b.exercises), ...loose];
    const [existingBlocks, existing] = await Promise.all([
      this.prisma.teamSessionBlock.findMany({ where: { teamSessionId }, select: { id: true } }),
      this.prisma.teamSessionExercise.findMany({ where: { teamSessionId }, select: { id: true, exerciseId: true } }),
    ]);
    const blockIds = new Set(existingBlocks.map((b) => b.id));
    for (const b of cleaned) if (b.id && !blockIds.has(b.id)) throw new BadRequestException("Uno de los bloques no es de esta sesión.");
    const byId = new Map(existing.map((e) => [e.id, e]));
    const kept = new Set<string>();
    for (const ex of incoming) {
      // El plan no tiene atleta: el % del RM siempre está disponible (como en una rutina).
      if (ex.targetWeight != null && ex.targetPercentRm != null) throw new BadRequestException("Usa peso fijo o % del RM, no ambos.");
      if (!ex.id) continue;
      if (!byId.has(ex.id)) throw new BadRequestException("Uno de los ejercicios no es de esta sesión.");
      if (kept.has(ex.id)) throw new BadRequestException("Un ejercicio aparece repetido.");
      kept.add(ex.id);
    }
    await this.assertExercisesAvailable(coachId, incoming.filter((ex) => !ex.id || byId.get(ex.id)?.exerciseId !== ex.exerciseId));

    const summary = emptySummary();
    const changed: { id: string; athleteId: string }[] = [];
    await this.prisma.$transaction(async (tx) => {
      await tx.teamSessionExercise.deleteMany({ where: { teamSessionId, id: { notIn: [...kept] } } });
      await tx.teamSessionBlock.deleteMany({ where: { teamSessionId, id: { notIn: cleaned.map((b) => b.id).filter((x): x is string => Boolean(x)) } } });
      let order = 0;
      const place = async (ex: SessionStructureExerciseDto, blockId: string | null) => {
        const data = {
          exerciseId: ex.exerciseId,
          orderIndex: ++order,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeight: ex.targetWeight ?? null,
          targetPercentRm: ex.targetPercentRm ?? null,
          targetRestSeconds: ex.targetRestSeconds ?? null,
          targetRir: ex.targetRir ?? null,
          note: cleanNote(ex.note) ?? null,
          blockId,
        };
        if (ex.id) await tx.teamSessionExercise.update({ where: { id: ex.id }, data });
        else await tx.teamSessionExercise.create({ data: { ...data, teamSessionId } });
      };
      for (const [index, b] of cleaned.entries()) {
        const data = { name: b.name, type: b.type, color: b.color, note: b.note, orderIndex: index + 1 };
        const saved = b.id ? await tx.teamSessionBlock.update({ where: { id: b.id }, data }) : await tx.teamSessionBlock.create({ data: { ...data, teamSessionId } });
        for (const ex of blocks[index].exercises) await place(ex, saved.id);
      }
      for (const ex of loose) await place(ex, null);
      await this.propagate(tx, teamSessionId, today, summary, changed);
    });
    this.announce(coachId, changed, "changed", incoming.some((e) => e.targetPercentRm != null));
    return summary;
  }

  private async assertExercisesAvailable(coachId: string, exercises: Array<{ exerciseId: string }>) {
    const ids = [...new Set(exercises.map((e) => e.exerciseId))];
    if (ids.length === 0) return;
    const found = await this.prisma.exercise.count({ where: { id: { in: ids }, isActive: true, OR: [{ createdBy: null }, { createdBy: coachId }] } });
    if (found !== ids.length) throw new BadRequestException("Uno de los ejercicios elegidos no está disponible.");
  }

  // Eliminar una sesión del plan: se quita de quienes la recibirían un cambio; lo registrado, lo
  // ajustado y lo pasado se conserva.
  private async removeMaster(tx: Tx, teamSessionId: string, today: Date, summary: PropagationSummary) {
    const { teamCycleId } = await tx.teamSession.findUniqueOrThrow({ where: { id: teamSessionId }, select: { teamCycleId: true } });
    const current = await this.currentAthletes(tx, teamCycleId);
    for (const copy of await this.lockedCopies(tx, teamSessionId)) {
      if (!this.stillCounts(copy, current)) continue;
      const reason = skipReason(stateOf(copy), today);
      addToSummary(summary, reason);
      if (!reason) await tx.trainingSession.update({ where: { id: copy.id }, data: { deletedAt: new Date() } });
    }
    await tx.teamSession.delete({ where: { id: teamSessionId } });
  }

  async deleteSession(coachId: string, teamSessionId: string, todayInput?: string) {
    await this.ownedSession(coachId, teamSessionId);
    const today = this.today(todayInput);
    const summary = emptySummary();
    await this.prisma.$transaction((tx) => this.removeMaster(tx, teamSessionId, today, summary));
    return summary;
  }

  // --- datos del ciclo ---

  async update(coachId: string, teamCycleId: string, dto: UpdateTeamCycleDto) {
    const cycle = await this.ownedCycle(coachId, teamCycleId);
    const startDate = startOfUtcDay(dto.startDate ? new Date(dto.startDate) : cycle.startDate);
    const endDate = startOfUtcDay(dto.endDate ? new Date(dto.endDate) : cycle.endDate);
    const startMoved = startDate.getTime() !== startOfUtcDay(cycle.startDate).getTime();
    const endMoved = endDate.getTime() !== startOfUtcDay(cycle.endDate).getTime();
    if ((startMoved || endMoved) && !isValidRange(startDate, endDate)) throw new BadRequestException(CYCLE_DATE_MESSAGES.endNotAfterStart);
    if (startMoved) {
      const startError = startDateError(startDate, dto.today);
      if (startError) throw new BadRequestException(startError);
    }
    if (startMoved || endMoved) await this.assertDatesFree(cycle.teamId, { startDate, endDate }, teamCycleId);

    const data = { ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.objective !== undefined ? { objective: dto.objective } : {}), startDate, endDate };
    await this.prisma.$transaction(async (tx) => {
      const copies = await tx.trainingCycle.findMany({ where: { teamCycleId, status: "active" } });
      const sessionsByCopy = new Map<string, Awaited<ReturnType<typeof copySessions>>>();
      for (const copy of copies) sessionsByCopy.set(copy.id, await copySessions(tx, copy.id));
      // No se puede acortar ni mover el ciclo si alguna sesión quedaría fuera: ni del plan del equipo
      // ni de la ficha de un atleta (por ejemplo, una ajustada o una registrada).
      if (startMoved || endMoved) {
        const masters = await tx.teamSession.findMany({ where: { teamCycleId }, select: { id: true, scheduledDate: true } });
        const mastersOut = masters.filter((m) => startOfUtcDay(m.scheduledDate) < startDate || startOfUtcDay(m.scheduledDate) > endDate);
        const counted = new Map(mastersOut.map((m) => [m.id, startOfUtcDay(m.scheduledDate).getTime()]));
        // La copia de una sesión del equipo que ya se cuenta, en su mismo día, no suma de nuevo.
        const own = [...sessionsByCopy.values()].flatMap((sessions) => sessionsOutside(sessions, { startDate, endDate }) as typeof sessions);
        const outside = [...mastersOut, ...own.filter((s) => !(s.teamSessionId && s.scheduledDate && counted.get(s.teamSessionId) === startOfUtcDay(s.scheduledDate).getTime()))];
        if (outside.length > 0) throw new ConflictException(outsideError(outside));
      }
      await tx.teamCycle.update({ where: { id: teamCycleId }, data });
      for (const copy of copies) {
        const sessions = sessionsByCopy.get(copy.id)!;
        if (startMoved && sessions.length > 0) {
          const placed = renumberForStart(sessions, startDate);
          for (const [i, s] of sessions.entries()) await tx.trainingSession.update({ where: { id: s.id }, data: { slotNumber: -(i + 1) } });
          for (const s of sessions) await tx.trainingSession.update({ where: { id: s.id }, data: placed.get(s.id)! });
        }
        await tx.trainingCycle.update({ where: { id: copy.id }, data });
      }
    });
    return this.detail(coachId, teamCycleId);
  }

  // --- entradas y salidas ---

  // Ciclos del equipo vigentes o futuros: al agregar atletas se pregunta si se les asignan.
  async pendingFor(teamId: string, todayInput?: string) {
    const today = this.today(todayInput);
    return this.prisma.teamCycle.findMany({
      where: { teamId, status: "active", endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
  }

  // El atleta que entra recibe las sesiones desde ese día (incluido), sin duplicar las que ya tenga.
  async join(coachId: string, teamCycleId: string, athleteIds: string[], todayInput?: string) {
    const cycle = await this.ownedCycle(coachId, teamCycleId);
    const today = this.today(todayInput);
    const ids = await this.assertCanReceive(coachId, cycle.teamId, athleteIds);
    const changed: { id: string; athleteId: string }[] = [];
    await this.prisma.$transaction(async (tx) => {
      const masters = await tx.teamSession.findMany({ where: { teamCycleId, scheduledDate: { gte: today } }, include: MASTER_INCLUDE, orderBy: { scheduledDate: "asc" } });
      for (const athleteId of ids) {
        const copy =
          (await tx.trainingCycle.findFirst({ where: { teamCycleId, athleteId, status: "active" } })) ?? (await this.createCopyCycle(tx, cycle, athleteId));
        const has = await tx.trainingSession.findMany({
          where: { teamSessionId: { in: masters.map((m) => m.id) }, deletedAt: null, cycle: { athleteId } },
          select: { teamSessionId: true },
        });
        const already = new Set(has.map((h) => h.teamSessionId));
        for (const master of masters) {
          if (!already.has(master.id)) changed.push({ id: await this.createCopySession(tx, copy, master), athleteId });
        }
      }
    });
    this.announce(coachId, changed, "added", true);
    return { delivered: changed.length };
  }

  // Sesiones de las copias de un ciclo del equipo para unas personas (o todas).
  private copySessions(db: Tx | PrismaService, teamCycleIds: string[], athleteId?: string) {
    return db.trainingSession.findMany({
      where: { deletedAt: null, teamSessionId: { not: null }, cycle: { teamCycleId: { in: teamCycleIds }, ...(athleteId ? { athleteId } : {}) } },
      include: COPY_INCLUDE,
    });
  }

  private tally(copies: Copy[], today: Date) {
    const counts = { remove: 0, keep_recorded: 0, keep_adjusted: 0, keep_past: 0 };
    for (const c of copies) counts[removalFate(stateOf(c), today)] += 1;
    return { removed: counts.remove, keptRecorded: counts.keep_recorded, keptAdjusted: counts.keep_adjusted, keptPast: counts.keep_past };
  }

  // La regla de salida: se quitan las futuras sin registrar ni ajustar; lo demás se conserva y queda
  // separado. Si la copia se queda sin sesiones, se archiva.
  private async release(tx: Tx, teamCycleIds: string[], today: Date, athleteId?: string) {
    if (teamCycleIds.length === 0) return;
    await tx.$queryRaw`SELECT s.id FROM "TrainingSession" s JOIN "TrainingCycle" c ON c.id = s."cycleId" WHERE c."teamCycleId" = ANY(${teamCycleIds}) FOR UPDATE OF s`;
    for (const copy of await this.copySessions(tx, teamCycleIds, athleteId)) {
      const fate = removalFate(stateOf(copy), today);
      await tx.trainingSession.update({
        where: { id: copy.id },
        data: fate === "remove" ? { deletedAt: new Date() } : { detachedAt: copy.detachedAt ?? new Date() },
      });
    }
    const cycles = await tx.trainingCycle.findMany({
      where: { teamCycleId: { in: teamCycleIds }, ...(athleteId ? { athleteId } : {}) },
      select: { id: true, _count: { select: { sessions: { where: { deletedAt: null } } } } },
    });
    for (const c of cycles) {
      await tx.trainingCycle.update({ where: { id: c.id }, data: { teamCycleId: null, ...(c._count.sessions === 0 ? { status: "archived" } : {}) } });
    }
  }

  private async activeIds(teamId: string) {
    return (await this.prisma.teamCycle.findMany({ where: { teamId }, select: { id: true } })).map((c) => c.id);
  }

  async memberImpact(coachId: string, teamId: string, athleteId: string, todayInput?: string) {
    await this.ownedTeam(coachId, teamId);
    return this.tally(await this.copySessions(this.prisma, await this.activeIds(teamId), athleteId), this.today(todayInput));
  }

  async releaseMember(teamId: string, athleteId: string, todayInput?: string) {
    const today = this.today(todayInput);
    const ids = await this.activeIds(teamId);
    await this.prisma.$transaction((tx) => this.release(tx, ids, today, athleteId));
  }

  async cycleImpact(coachId: string, teamCycleId: string, todayInput?: string) {
    await this.ownedCycle(coachId, teamCycleId);
    return this.tally(await this.copySessions(this.prisma, [teamCycleId]), this.today(todayInput));
  }

  // Eliminar el ciclo o el equipo aplica la misma regla que sacar a un atleta.
  async remove(coachId: string, teamCycleId: string, todayInput?: string) {
    await this.ownedCycle(coachId, teamCycleId);
    const today = this.today(todayInput);
    await this.prisma.$transaction(async (tx) => {
      await this.release(tx, [teamCycleId], today);
      await tx.teamCycle.delete({ where: { id: teamCycleId } });
    });
  }

  async releaseTeam(teamId: string, todayInput?: string) {
    const today = this.today(todayInput);
    const ids = await this.activeIds(teamId);
    await this.prisma.$transaction((tx) => this.release(tx, ids, today));
  }
}
