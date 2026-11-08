import { BadRequestException } from "@nestjs/common";
import type { EventIntensity, EventRepeat, EventScope, EventSport, EventType } from "@cycles/shared";

// Los límites son los de @cycles/shared (EVENT_*_MAX), copiados aquí a propósito: la API solo
// importa TIPOS de @cycles/shared. Un import de valores mete el paquete compartido en la
// compilación, cambia la carpeta de salida y `node apps/api/dist/main.js` deja de existir
// (así falló el despliegue de CYC-251). Una prueba comprueba que siguen iguales.
export const EVENT_TITLE_MAX = 60;
export const EVENT_NOTES_MAX = 500;
export const EVENT_DURATION_MAX = 600;

// Validación estricta de lo que manda el atleta al crear o editar una actividad paralela
// (CYC-251). Listas cerradas, topes de largo y nada de campos de más.

export const EVENT_TYPES = ["training", "match", "rest", "travel", "injury", "other"] as const satisfies readonly EventType[];
export const EVENT_SPORTS = ["volleyball", "soccer", "basketball", "running", "cycling", "swimming", "weights", "yoga", "other"] as const satisfies readonly EventSport[];
export const EVENT_INTENSITIES = ["low", "medium", "high"] as const satisfies readonly EventIntensity[];
export const EVENT_SCOPES = ["occurrence", "series"] as const satisfies readonly EventScope[];

// Los datos de una actividad (la serie completa o lo que cambia en un día).
export interface EventFields {
  type: EventType;
  sport: EventSport | null;
  title: string;
  date: string;
  startTime: string | null;
  durationMin: number | null;
  allDay: boolean;
  intensity: EventIntensity | null;
  notes: string | null;
  repeat: EventRepeat | null;
}

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function day(value: unknown, field: string): string {
  return isDay(value) ? value : fail(`«${field}» debe ser una fecha AAAA-MM-DD que exista.`);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) return fail(`«${field}» debe ser uno de: ${allowed.join(", ")}.`);
  return value as T;
}

function onlyKeys(obj: Record<string, unknown>, allowed: readonly string[]): void {
  const extra = Object.keys(obj).filter((k) => !allowed.includes(k));
  if (extra.length > 0) fail(`Campos que no existen: ${extra.join(", ")}.`);
}

function parseRepeat(value: unknown): EventRepeat {
  if (!isRecord(value)) return fail("«repeat» debe ser un objeto con «days» y «until».");
  onlyKeys(value, ["days", "until"]);
  const days = value.days;
  if (!Array.isArray(days) || days.length === 0 || days.length > 7) return fail("«repeat.days» debe tener entre 1 y 7 días.");
  const ints = days.map((d) => (typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6 ? d : fail("«repeat.days» solo admite enteros de 0 (lunes) a 6 (domingo).")));
  if (new Set(ints).size !== ints.length) fail("«repeat.days» no puede repetir días.");
  const until = value.until === null || value.until === undefined ? null : day(value.until, "repeat.until");
  return { days: [...ints].sort((a, b) => a - b), until };
}

// Cada campo que viene en el cuerpo, ya validado (los que no vienen no aparecen).
function parseFields(body: Record<string, unknown>): Partial<EventFields> {
  const out: Partial<EventFields> = {};
  if (body.type !== undefined) out.type = oneOf(body.type, EVENT_TYPES, "type");
  if (body.sport !== undefined) out.sport = body.sport === null ? null : oneOf(body.sport, EVENT_SPORTS, "sport");
  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length === 0 || title.length > EVENT_TITLE_MAX) fail(`«title» debe tener entre 1 y ${EVENT_TITLE_MAX} caracteres.`);
    out.title = title;
  }
  if (body.date !== undefined) out.date = day(body.date, "date");
  if (body.startTime !== undefined) {
    if (body.startTime === null) out.startTime = null;
    else if (typeof body.startTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)) out.startTime = body.startTime;
    else fail("«startTime» debe ser una hora HH:mm.");
  }
  if (body.durationMin !== undefined) {
    if (body.durationMin === null) out.durationMin = null;
    else if (typeof body.durationMin === "number" && Number.isInteger(body.durationMin) && body.durationMin >= 1 && body.durationMin <= EVENT_DURATION_MAX) out.durationMin = body.durationMin;
    else fail(`«durationMin» debe ser un entero entre 1 y ${EVENT_DURATION_MAX}.`);
  }
  if (body.allDay !== undefined) out.allDay = typeof body.allDay === "boolean" ? body.allDay : fail("«allDay» debe ser verdadero o falso.");
  if (body.intensity !== undefined) out.intensity = body.intensity === null ? null : oneOf(body.intensity, EVENT_INTENSITIES, "intensity");
  if (body.notes !== undefined) {
    if (body.notes === null) out.notes = null;
    else if (typeof body.notes === "string" && body.notes.length <= EVENT_NOTES_MAX) out.notes = body.notes.trim() === "" ? null : body.notes.trim();
    else fail(`«notes» debe ser texto de hasta ${EVENT_NOTES_MAX} caracteres.`);
  }
  if (body.repeat !== undefined) out.repeat = body.repeat === null ? null : parseRepeat(body.repeat);
  return out;
}

const FIELD_KEYS = ["type", "sport", "title", "date", "startTime", "durationMin", "allDay", "intensity", "notes", "repeat"] as const;

// Reglas que dependen de varios campos a la vez.
export function assertConsistent(e: EventFields, opts: { checkRule?: boolean } = {}): void {
  if (e.allDay && (e.startTime !== null || e.durationMin !== null)) fail("Una actividad de todo el día no lleva hora ni duración.");
  if (e.durationMin !== null && e.startTime === null && !e.allDay) fail("La duración necesita una hora de inicio.");
  if (opts.checkRule !== false && e.repeat) {
    if (e.repeat.until !== null && e.repeat.until < e.date) fail("«repeat.until» no puede ser anterior a la fecha de inicio.");
    const weekday = (new Date(`${e.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    if (!e.repeat.days.includes(weekday)) fail("La fecha de inicio debe caer en uno de los días de la repetición.");
  }
}

export function parseCreate(body: unknown): EventFields {
  if (!isRecord(body)) return fail("El cuerpo debe ser un objeto.");
  onlyKeys(body, FIELD_KEYS);
  const f = parseFields(body);
  if (f.type === undefined || f.title === undefined || f.date === undefined) fail("Faltan «type», «title» o «date».");
  const event: EventFields = {
    type: f.type as EventType,
    sport: f.sport ?? null,
    title: f.title as string,
    date: f.date as string,
    startTime: f.startTime ?? null,
    durationMin: f.durationMin ?? null,
    allDay: f.allDay ?? false,
    intensity: f.intensity ?? null,
    notes: f.notes ?? null,
    repeat: f.repeat ?? null,
  };
  assertConsistent(event);
  return event;
}

export interface ParsedUpdate {
  scope: EventScope;
  occurrenceDate: string | null;
  patch: Partial<EventFields>;
}

// Editar: «solo esta ocurrencia» lleva `occurrenceDate` y no puede mover el día ni cambiar la
// repetición; «toda la serie» no lleva `occurrenceDate`.
export function parseUpdate(body: unknown): ParsedUpdate {
  if (!isRecord(body)) return fail("El cuerpo debe ser un objeto.");
  onlyKeys(body, [...FIELD_KEYS, "scope", "occurrenceDate"]);
  const scope = oneOf(body.scope, EVENT_SCOPES, "scope");
  const patch = parseFields(body);
  if (scope === "occurrence") {
    if (body.occurrenceDate === undefined) fail("Con scope «occurrence» falta «occurrenceDate».");
    if (patch.date !== undefined) fail("Para mover un día, elimínalo y crea otro: con scope «occurrence» no se manda «date».");
    if (patch.repeat !== undefined) fail("Con scope «occurrence» no se cambia la repetición.");
    return { scope, occurrenceDate: day(body.occurrenceDate, "occurrenceDate"), patch };
  }
  if (body.occurrenceDate !== undefined) fail("Con scope «series» no se manda «occurrenceDate».");
  if (Object.keys(patch).length === 0) fail("No hay nada que cambiar.");
  return { scope, occurrenceDate: null, patch };
}

export function parseDeleteQuery(query: Record<string, unknown>): { scope: EventScope; date: string | null } {
  const scope = oneOf(query.scope, EVENT_SCOPES, "scope");
  if (scope === "occurrence") return { scope, date: day(query.date, "date") };
  return { scope, date: null };
}
