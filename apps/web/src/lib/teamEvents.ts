// Eventos y Rankings de un equipo (CYC-319, docs/diseno/equipos-sidebar). Lógica pura.
import type {
  AthleteEventOccurrence,
  CreateTeamEventInput,
  EventType,
  TeamCalendarResponse,
  TeamEventOccurrence,
  TeamEventType,
  TeamRankingRow,
} from "@cycles/shared";
import { MONTH_NAMES, WEEKDAY_SHORT, addDays, longDay, shortDate, startOfWeek, weekdayOf } from "./eventCalendar";
import type { LoadClash } from "./loadClash";

// Colores del diseño de Equipos para el círculo de cada tipo.
export const TYPE_COLOR: Record<EventType, string> = {
  match: "#1f2228",
  training: "#d9822b",
  travel: "#8d95a3",
  rest: "#7a4dd8",
  other: "#4f7fd1",
  injury: "#d1494d",
};

export const TEAM_TYPE_OPTIONS: { value: TeamEventType; label: string }[] = [
  { value: "match", label: "Partido o competencia" },
  { value: "training", label: "Entrenamiento" },
  { value: "travel", label: "Viaje" },
  { value: "rest", label: "Descanso activo" },
  { value: "other", label: "Otro" },
];

const TYPE_NAME: Record<EventType, string> = {
  match: "Partido o competencia",
  training: "Entrenamiento",
  travel: "Viaje",
  rest: "Descanso activo",
  other: "Otro",
  injury: "Lesión",
};
export const typeName = (type: EventType) => TYPE_NAME[type] ?? "Otro";

// «Semana del 23 al 29 nov» (o «del 30 nov al 6 dic» si cruza de mes).
export function weekTitle(anchor: string): string {
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `Semana del ${sameMonth ? Number(from.slice(8, 10)) : shortDate(from)} al ${shortDate(to)}`;
}

// «Mar 24».
export const dayLabel = (iso: string) => `${WEEKDAY_SHORT[weekdayOf(iso)]} ${Number(iso.slice(8, 10))}`;

// «Sáb 28 nov», para el cuadro de eliminar.
export const fullDayLabel = (iso: string) => `${dayLabel(iso)} ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

// «19:00, 90 min», «Todo el día» o «Sin hora».
export function hourLabel(event: { allDay: boolean; startTime: string | null; durationMin: number | null }): string {
  if (event.allDay) return "Todo el día";
  if (!event.startTime) return "Sin hora";
  return event.durationMin ? `${event.startTime}, ${event.durationMin} min` : event.startTime;
}

interface RowBase {
  key: string;
  date: string;
  type: EventType;
  title: string;
  allDay: boolean;
  startTime: string | null;
  durationMin: number | null;
}
export type EventRow =
  | (RowBase & { kind: "team"; event: TeamEventOccurrence })
  | (RowBase & { kind: "athletes"; people: { id: string; name: string }[] });

// La lista de la semana: los eventos del equipo (editables) y lo que agregaron los atletas (solo
// lectura). Lo que varios agregaron igual (día, tipo, nombre y hora) va en una sola fila.
export function eventRows(data: TeamCalendarResponse, from: string, to: string): EventRow[] {
  const inWeek = (date: string) => date >= from && date <= to;
  const rows: EventRow[] = data.teamEvents
    .filter((e) => inWeek(e.date))
    .map((e) => ({ kind: "team", key: `team:${e.seriesId}:${e.date}`, date: e.date, type: e.type, title: e.title, allDay: e.allDay, startTime: e.startTime, durationMin: e.durationMin, event: e }));
  const grouped = new Map<string, Extract<EventRow, { kind: "athletes" }>>();
  for (const e of data.athleteEvents) {
    if (!inWeek(e.date)) continue;
    const key = `athletes:${e.date}:${e.type}:${e.title.trim().toLowerCase()}:${e.allDay}:${e.startTime ?? ""}:${e.durationMin ?? ""}`;
    const row = grouped.get(key) ?? { kind: "athletes" as const, key, date: e.date, type: e.type, title: e.title.trim(), allDay: e.allDay, startTime: e.startTime, durationMin: e.durationMin, people: [] };
    if (!row.people.some((p) => p.id === e.athleteId)) row.people.push({ id: e.athleteId, name: e.athleteName });
    grouped.set(key, row);
  }
  return [...rows, ...grouped.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title, "es"),
  );
}

export const whoLabel = (people: { name: string }[]) => (people.length === 1 ? people[0].name : `${people.length} atletas`);

// Para el choque de carga de un atleta: sus actividades y los partidos del equipo.
export function eventsForClash(data: TeamCalendarResponse, athleteId: string): AthleteEventOccurrence[] {
  const matches: AthleteEventOccurrence[] = data.teamEvents
    .filter((e) => e.type === "match")
    .map((e) => ({ seriesId: e.seriesId, date: e.date, type: e.type, sport: null, title: e.title, startTime: e.startTime, durationMin: e.durationMin, allDay: e.allDay, intensity: null, notes: null, repeat: e.repeat, isException: false }));
  return [...data.athleteEvents.filter((e) => e.athleteId === athleteId), ...matches];
}

const dayWord = (iso: string) => `el ${longDay(iso).split(" ")[0]}`;

function joinDays(days: string[]): string {
  const words = days.map(dayWord);
  return words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}`;
}

// «Camila Rojas tiene partido el sábado y sesión el viernes y el sábado.» Habla de la primera
// actividad que choca; el resto se ve en la ficha del atleta.
export function clashLine(name: string, clashes: LoadClash[]): string {
  const first = [...clashes].sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.sessionDate.localeCompare(b.sessionDate))[0];
  const sessionDays = [...new Set(clashes.filter((c) => c.eventDate === first.eventDate && c.event.title === first.event.title).map((c) => c.sessionDate))].sort();
  const what = first.event.type === "match" ? "partido" : first.event.title.trim().toLowerCase();
  return `${name} tiene ${what} ${dayWord(first.eventDate)} y sesión ${joinDays(sessionDays)}.`;
}

// ── Formulario del evento ──────────────────────────────────────────────────────────────────────

export interface EventForm {
  type: TeamEventType;
  title: string;
  date: string;
  startTime: string;
  duration: string;
  allDay: boolean;
  // Días en que se repite (0 lunes … 6 domingo); vacío: no se repite.
  days: number[];
  until: string;
  notes: string;
}

export const emptyForm = (date: string): EventForm => ({ type: "match", title: "", date, startTime: "", duration: "", allDay: false, days: [], until: "", notes: "" });

// Se edita la serie completa: la fecha es la de su inicio, no la del día que se tocó.
export const formOf = (e: TeamEventOccurrence): EventForm => ({
  type: e.type,
  title: e.title,
  date: e.seriesDate,
  startTime: e.startTime ?? "",
  duration: e.durationMin ? String(e.durationMin) : "",
  allDay: e.allDay,
  days: e.repeat?.days ?? [],
  until: e.repeat?.until ?? "",
  notes: e.notes ?? "",
});

// Si se repite, el día de la fecha siempre es uno de los días.
export function repeatDaysOf(form: Pick<EventForm, "days" | "date">): number[] {
  if (form.days.length === 0 || !form.date) return form.days;
  return [...new Set([...form.days, weekdayOf(form.date)])].sort((a, b) => a - b);
}

export function toggleDay(form: EventForm, day: number): EventForm {
  const current = repeatDaysOf(form);
  if (!current.includes(day)) return { ...form, days: repeatDaysOf({ ...form, days: [...current, day] }) };
  // El día de la fecha solo se apaga cuando es el único: así deja de repetirse.
  if (form.date && day === weekdayOf(form.date) && current.length > 1) return form;
  return { ...form, days: current.filter((d) => d !== day) };
}

export function changeDate(form: EventForm, date: string): EventForm {
  // «Cada sábado» movido a un domingo pasa a ser «cada domingo».
  const weekly = Boolean(form.date && date) && form.days.length === 1 && form.days[0] === weekdayOf(form.date);
  return { ...form, date, days: weekly ? [weekdayOf(date)] : form.days };
}

export function formProblem(form: EventForm): string | null {
  if (form.title.trim() === "") return "Ponle un nombre al evento.";
  if (!form.date) return "Elige la fecha.";
  if (!form.allDay && form.duration !== "") {
    const minutes = Number(form.duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) return "La duración va de 1 a 600 minutos.";
    if (!form.startTime) return "Para poner la duración, agrega la hora.";
  }
  if (form.days.length > 0 && form.until && form.until < form.date) return "La repetición no puede terminar antes de la fecha.";
  return null;
}

export function formPayload(form: EventForm): CreateTeamEventInput {
  const days = repeatDaysOf(form);
  return {
    type: form.type,
    title: form.title.trim(),
    date: form.date,
    startTime: form.allDay ? null : form.startTime || null,
    durationMin: form.allDay || form.duration === "" ? null : Number(form.duration),
    allDay: form.allDay,
    notes: form.notes.trim() || null,
    repeat: days.length > 0 ? { days, until: form.until || null } : null,
  };
}

// ── Rankings ───────────────────────────────────────────────────────────────────────────────────

// El puesto solo se da a quien tiene cifras; los que no, quedan al final sin número.
export const rankOf = (rows: TeamRankingRow[], index: number): number | null =>
  rows[index].percent === null ? null : rows.slice(0, index + 1).filter((r) => r.percent !== null).length;

export function noFiguresLabel(row: Pick<TeamRankingRow, "status">): string {
  if (row.status === "pending") return "Invitación pendiente";
  if (row.status === "inactive") return "Ya no es tu atleta";
  return "Sin sesiones en el período";
}

export const countsLabel = (row: Pick<TeamRankingRow, "completed" | "assigned">) =>
  `${row.completed} de ${row.assigned} ${row.assigned === 1 ? "sesión completada" : "sesiones completadas"}`;
