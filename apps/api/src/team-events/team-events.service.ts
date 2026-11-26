import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { RankingPeriod, TeamCalendarResponse, TeamEventOccurrence, TeamEventSeries, TeamEventType, TeamRankingsResponse } from "@cycles/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { assertConsistent, type EventFields } from "../events/event-input";
import { datesInRange, parseRange } from "../events/recurrence";
import { parseTeamEvent, parseTeamEventPatch } from "./team-event-input";
import { countSessions, percentOf, sortRanking } from "./ranking";

// Eventos del equipo (CYC-317, docs/diseno/equipos-sidebar). Los crea, edita y borra solo el coach
// dueño (un equipo ajeno responde 404). El atleta los lee por pertenecer al equipo mientras su
// relación con ese coach esté activa (R5); no se copian a sus actividades.

// Tope de eventos por equipo (cada serie cuenta una).
export const MAX_EVENTS_PER_TEAM = 200;

const day = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => new Date(`${s}T00:00:00Z`);

type Row = Prisma.TeamEventGetPayload<{ include: { team: { select: { name: true } } } }>;

function fieldsOf(row: Row): EventFields {
  return {
    type: row.type,
    sport: null,
    title: row.title,
    date: day(row.date),
    startTime: row.startTime,
    durationMin: row.durationMin,
    allDay: row.allDay,
    intensity: null,
    notes: row.notes,
    repeat: row.repeatDays.length > 0 ? { days: [...row.repeatDays].sort((a, b) => a - b), until: row.repeatUntil ? day(row.repeatUntil) : null } : null,
  };
}

function seriesOf(row: Row): TeamEventSeries {
  const { sport: _sport, intensity: _intensity, type, ...rest } = fieldsOf(row);
  return { id: row.id, teamId: row.teamId, type: type as TeamEventType, ...rest };
}

function dataOf(f: EventFields) {
  return {
    type: f.type,
    title: f.title,
    date: at(f.date),
    startTime: f.startTime,
    durationMin: f.durationMin,
    allDay: f.allDay,
    notes: f.notes,
    repeatDays: f.repeat ? f.repeat.days : [],
    repeatUntil: f.repeat?.until ? at(f.repeat.until) : null,
  };
}

const inRange = (from: string, to: string): Prisma.TeamEventWhereInput => ({
  date: { lte: at(to) },
  OR: [
    { repeatDays: { isEmpty: true }, date: { gte: at(from) } },
    { repeatDays: { isEmpty: false }, OR: [{ repeatUntil: null }, { repeatUntil: { gte: at(from) } }] },
  ],
});

function expandRows(rows: Row[], from: string, to: string): TeamEventOccurrence[] {
  return rows
    .flatMap((row) => {
      const { id, date: seriesDate, ...series } = seriesOf(row);
      return datesInRange({ date: seriesDate, repeat: series.repeat }, from, to).map((date) => ({ ...series, seriesId: id, seriesDate, date, teamName: row.team.name }));
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title, "es"),
    );
}

@Injectable()
export class TeamEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly athleteEvents: EventsService,
  ) {}

  private async ownedTeam(coachId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, coachId } });
    if (!team) throw new NotFoundException("Equipo no encontrado.");
    return team;
  }

  private async ownedEvent(coachId: string, teamId: string, eventId: string): Promise<Row> {
    await this.ownedTeam(coachId, teamId);
    const row = await this.prisma.teamEvent.findFirst({ where: { id: eventId, teamId }, include: { team: { select: { name: true } } } });
    if (!row) throw new NotFoundException("Evento no encontrado.");
    return row;
  }

  private async occurrences(where: Prisma.TeamEventWhereInput, from: string, to: string): Promise<TeamEventOccurrence[]> {
    const rows = await this.prisma.teamEvent.findMany({ where: { AND: [where, inRange(from, to)] }, include: { team: { select: { name: true } } } });
    return expandRows(rows, from, to);
  }

  async list(coachId: string, teamId: string, query: { from?: unknown; to?: unknown }) {
    await this.ownedTeam(coachId, teamId);
    const { from, to } = parseRange(query.from, query.to);
    return { events: await this.occurrences({ teamId }, from, to) };
  }

  async create(coachId: string, teamId: string, body: unknown): Promise<TeamEventSeries> {
    await this.ownedTeam(coachId, teamId);
    const event = parseTeamEvent(body);
    if ((await this.prisma.teamEvent.count({ where: { teamId } })) >= MAX_EVENTS_PER_TEAM) {
      throw new BadRequestException(`El equipo llegó al máximo de ${MAX_EVENTS_PER_TEAM} eventos. Elimina alguno para agregar otro.`);
    }
    const row = await this.prisma.teamEvent.create({ data: { teamId, createdById: coachId, ...dataOf(event) }, include: { team: { select: { name: true } } } });
    return seriesOf(row);
  }

  async update(coachId: string, teamId: string, eventId: string, body: unknown): Promise<TeamEventSeries> {
    const patch = parseTeamEventPatch(body);
    const merged = { ...fieldsOf(await this.ownedEvent(coachId, teamId, eventId)), ...patch };
    assertConsistent(merged);
    const row = await this.prisma.teamEvent.update({ where: { id: eventId }, data: dataOf(merged), include: { team: { select: { name: true } } } });
    return seriesOf(row);
  }

  async remove(coachId: string, teamId: string, eventId: string): Promise<void> {
    await this.ownedEvent(coachId, teamId, eventId);
    await this.prisma.teamEvent.delete({ where: { id: eventId } });
  }

  // Los eventos de los equipos en que está el atleta, solo donde su coach sigue siendo su coach.
  async listMine(athleteId: string, query: { from?: unknown; to?: unknown }) {
    const { from, to } = parseRange(query.from, query.to);
    const relations = await this.prisma.coachAthlete.findMany({ where: { athleteId, status: "active" }, select: { coachId: true } });
    const where = { team: { coachId: { in: relations.map((r) => r.coachId) }, members: { some: { athleteId } } } };
    return { events: await this.occurrences(where, from, to) };
  }

  private async members(coachId: string, teamId: string) {
    const members = await this.prisma.teamMember.findMany({ where: { teamId }, include: { athlete: { select: { id: true, name: true } } } });
    const relations = await this.prisma.coachAthlete.findMany({
      where: { coachId, athleteId: { in: members.map((m) => m.athleteId) } },
      select: { athleteId: true, status: true },
    });
    const statusOf = new Map(relations.map((r) => [r.athleteId, r.status]));
    return members.map((m) => ({ id: m.athleteId, name: m.athlete.name, status: statusOf.get(m.athleteId) ?? ("inactive" as const) }));
  }

  // Calendario del equipo: sus eventos y las actividades de los atletas activos, sin sus notas.
  async calendar(coachId: string, teamId: string, query: { from?: unknown; to?: unknown }): Promise<TeamCalendarResponse> {
    await this.ownedTeam(coachId, teamId);
    const { from, to } = parseRange(query.from, query.to);
    const active = (await this.members(coachId, teamId)).filter((m) => m.status === "active");
    const [teamEvents, perAthlete] = await Promise.all([
      this.occurrences({ teamId }, from, to),
      Promise.all(
        active.map(async (m) =>
          (await this.athleteEvents.listForCoach(coachId, m.id, { from, to })).events.map((e) => ({ ...e, athleteId: m.id, athleteName: m.name })),
        ),
      ),
    ]);
    const athleteEvents = perAthlete.flat().sort((a, b) => a.date.localeCompare(b.date) || a.athleteName.localeCompare(b.athleteName, "es"));
    return { teamEvents, athleteEvents };
  }

  // Ranking por cumplimiento. Solo cuentan los ciclos de este coach con atletas activos.
  async rankings(coachId: string, teamId: string, period: unknown): Promise<TeamRankingsResponse> {
    await this.ownedTeam(coachId, teamId);
    const chosen: RankingPeriod = period === undefined ? "weeks4" : period === "weeks4" || period === "cycle" ? period : badPeriod();
    const members = await this.members(coachId, teamId);
    const cycles = await this.prisma.trainingCycle.findMany({
      where: { coachId, athleteId: { in: members.filter((m) => m.status === "active").map((m) => m.id) }, isTemplate: false, cycleType: { not: "macrocycle" } },
      select: { athleteId: true, status: true, startDate: true, endDate: true, sessions: { where: { deletedAt: null }, select: { weekNumber: true, status: true } } },
    });
    const now = new Date();
    const rows = members.map((m) => {
      const count = countSessions(cycles.filter((c) => c.athleteId === m.id), chosen, now);
      return { athleteId: m.id, name: m.name, status: m.status, ...count, percent: percentOf(count.completed, count.assigned) };
    });
    return { period: chosen, rows: sortRanking(rows) };
  }
}

function badPeriod(): never {
  throw new BadRequestException("«period» debe ser «weeks4» o «cycle».");
}
