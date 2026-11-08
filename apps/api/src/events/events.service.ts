import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AthleteEventOccurrence, AthleteEventSeries, AthleteEventsResponse } from "@cycles/shared";
import { PrismaService } from "../prisma/prisma.service";
import { assertActiveRelation } from "../common/access";
import { assertConsistent, parseCreate, parseDeleteQuery, parseUpdate, type EventFields } from "./event-input";
import { expand, occursOn, parseRange, type ExceptionRow, type SeriesRow } from "./recurrence";

// Actividades paralelas del atleta (CYC-251). El atleta las gestiona (el id sale del token) y
// el coach con relación activa solo las lee, sin las notas (R7).

// Tope de actividades por atleta (cada serie cuenta una).
export const MAX_EVENTS_PER_ATHLETE = 200;

const day = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => new Date(`${s}T00:00:00Z`);

type Row = Prisma.AthleteEventGetPayload<{ include: { exceptions: true } }>;

function toFields(row: Row): EventFields {
  return {
    type: row.type,
    sport: row.sport,
    title: row.title,
    date: day(row.date),
    startTime: row.startTime,
    durationMin: row.durationMin,
    allDay: row.allDay,
    intensity: row.intensity,
    notes: row.notes,
    repeat: row.repeatDays.length > 0 ? { days: [...row.repeatDays].sort((a, b) => a - b), until: row.repeatUntil ? day(row.repeatUntil) : null } : null,
  };
}

function toSeries(row: Row): AthleteEventSeries {
  return { id: row.id, ...toFields(row) };
}

function dataOf(f: EventFields) {
  return {
    type: f.type,
    sport: f.sport,
    title: f.title,
    date: at(f.date),
    startTime: f.startTime,
    durationMin: f.durationMin,
    allDay: f.allDay,
    intensity: f.intensity,
    notes: f.notes,
    repeatDays: f.repeat ? f.repeat.days : [],
    repeatUntil: f.repeat?.until ? at(f.repeat.until) : null,
  };
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // Ocurrencias del rango con la repetición ya resuelta.
  private async occurrences(athleteId: string, from: string, to: string, hideNotes: boolean): Promise<AthleteEventsResponse> {
    const rows = await this.prisma.athleteEvent.findMany({
      where: {
        athleteId,
        date: { lte: at(to) },
        OR: [
          { repeatDays: { isEmpty: true }, date: { gte: at(from) } },
          { repeatDays: { isEmpty: false }, OR: [{ repeatUntil: null }, { repeatUntil: { gte: at(from) } }] },
        ],
      },
      include: { exceptions: { where: { date: { gte: at(from), lte: at(to) } } } },
    });
    const series: SeriesRow[] = rows.map((r) => ({ id: r.id, ...toFields(r) }));
    const exceptions = new Map<string, ExceptionRow[]>(
      rows.map((r) => [
        r.id,
        r.exceptions.map((e) => ({ date: day(e.date), cancelled: e.cancelled, overrides: (e.overrides ?? null) as Partial<EventFields> | null })),
      ]),
    );
    const events = expand(series, exceptions, from, to).map<AthleteEventOccurrence>((o) => (hideNotes ? { ...o, notes: null } : o));
    return { events };
  }

  listMine(athleteId: string, query: { from?: unknown; to?: unknown }) {
    const { from, to } = parseRange(query.from, query.to);
    return this.occurrences(athleteId, from, to, false);
  }

  // El coach: solo con relación activa y sin las notas del atleta.
  async listForCoach(coachId: string, athleteId: string, query: { from?: unknown; to?: unknown }) {
    await assertActiveRelation(this.prisma, coachId, athleteId);
    const { from, to } = parseRange(query.from, query.to);
    return this.occurrences(athleteId, from, to, true);
  }

  private async own(athleteId: string, id: string): Promise<Row> {
    const row = await this.prisma.athleteEvent.findFirst({ where: { id, athleteId }, include: { exceptions: true } });
    if (!row) throw new NotFoundException("Actividad no encontrada.");
    return row;
  }

  async create(athleteId: string, body: unknown): Promise<AthleteEventSeries> {
    const event = parseCreate(body);
    if ((await this.prisma.athleteEvent.count({ where: { athleteId } })) >= MAX_EVENTS_PER_ATHLETE) {
      throw new BadRequestException(`Llegaste al máximo de ${MAX_EVENTS_PER_ATHLETE} actividades. Elimina alguna para agregar otra.`);
    }
    const row = await this.prisma.athleteEvent.create({ data: { athleteId, ...dataOf(event) }, include: { exceptions: true } });
    return toSeries(row);
  }

  async update(athleteId: string, id: string, body: unknown): Promise<AthleteEventSeries> {
    const { scope, occurrenceDate, patch } = parseUpdate(body);
    const row = await this.own(athleteId, id);
    const base = toFields(row);

    // Una actividad que no se repite es una sola: editar «solo ese día» o «toda la serie» es lo mismo.
    if (scope === "series" || !base.repeat) {
      if (scope === "occurrence" && occurrenceDate !== base.date) throw new NotFoundException("Esa ocurrencia no existe.");
      const merged = { ...base, ...patch };
      assertConsistent(merged);
      const saved = await this.prisma.athleteEvent.update({ where: { id }, data: dataOf(merged), include: { exceptions: true } });
      return toSeries(saved);
    }

    const date = occurrenceDate as string;
    const existing = row.exceptions.find((e) => day(e.date) === date);
    if (!occursOn(base, date) || existing?.cancelled) throw new NotFoundException("Esa ocurrencia no existe.");
    const overrides = { ...((existing?.overrides ?? {}) as Partial<EventFields>), ...patch };
    // El día editado también tiene que ser coherente (todo el día sin hora, etc.).
    assertConsistent({ ...base, ...overrides, date }, { checkRule: false });
    const json = overrides as unknown as Prisma.InputJsonValue;
    await this.prisma.athleteEventException.upsert({
      where: { eventId_date: { eventId: id, date: at(date) } },
      create: { eventId: id, date: at(date), overrides: json },
      update: { overrides: json },
    });
    return toSeries(await this.own(athleteId, id));
  }

  async remove(athleteId: string, id: string, query: Record<string, unknown>): Promise<void> {
    const { scope, date } = parseDeleteQuery(query);
    const row = await this.own(athleteId, id);
    const base = toFields(row);
    if (scope === "series" || !base.repeat) {
      if (scope === "occurrence" && date !== base.date) throw new NotFoundException("Esa ocurrencia no existe.");
      await this.prisma.athleteEvent.delete({ where: { id } });
      return;
    }
    const existing = row.exceptions.find((e) => day(e.date) === date);
    if (!occursOn(base, date as string) || existing?.cancelled) throw new NotFoundException("Esa ocurrencia no existe.");
    await this.prisma.athleteEventException.upsert({
      where: { eventId_date: { eventId: id, date: at(date as string) } },
      create: { eventId: id, date: at(date as string), cancelled: true },
      update: { cancelled: true, overrides: Prisma.DbNull },
    });
  }
}
