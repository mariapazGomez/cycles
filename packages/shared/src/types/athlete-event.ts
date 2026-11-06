// Actividades paralelas del atleta (CYC-237 diseño, CYC-251 API, CYC-252 app): lo que el
// atleta hace por su cuenta (voleibol, partidos de liga…). Tipos únicos para la API y la
// app: si cambia la forma, falla la compilación de los dos lados (patrón CYC-249).
// Fechas como «AAAA-MM-DD» (día local del atleta, sin zona horaria); horas «HH:mm».
export type EventType = "training" | "match" | "rest" | "travel" | "injury" | "other";
export type EventIntensity = "low" | "medium" | "high";
export type EventScope = "occurrence" | "series";

// Repetición semanal: días de la semana (0 = lunes … 6 = domingo) hasta una fecha o sin fin.
export interface EventRepeat {
  days: number[];
  until: string | null;
}

// Una ocurrencia ya expandida (GET /me/events devuelve la lista por rango, con la
// repetición resuelta): la app no reimplementa la regla.
export interface AthleteEventOccurrence {
  seriesId: string;
  // Día de esta ocurrencia.
  date: string;
  // true = esta ocurrencia se editó «solo este día».
  isException: boolean;
  type: EventType;
  title: string;
  startTime: string | null;
  durationMin: number | null;
  allDay: boolean;
  intensity: EventIntensity | null;
  notes: string | null;
  repeat: EventRepeat | null;
}

// La serie completa (POST y PATCH la devuelven): la misma forma sin los datos de una
// ocurrencia concreta. `date` es el día de inicio de la serie.
export interface AthleteEventSeries {
  id: string;
  type: EventType;
  title: string;
  date: string;
  startTime: string | null;
  durationMin: number | null;
  allDay: boolean;
  intensity: EventIntensity | null;
  notes: string | null;
  repeat: EventRepeat | null;
}

// Reglas acordadas con la API (CYC-251): título 1–60, notas hasta 500, duración 1–600 min,
// rango de consulta de 92 días como máximo, allDay ⇒ sin hora ni duración.
export const EVENT_TITLE_MAX = 60;
export const EVENT_NOTES_MAX = 500;
export const EVENT_DURATION_MAX = 600;
export const EVENT_RANGE_MAX_DAYS = 92;

export interface AthleteEventsResponse {
  events: AthleteEventOccurrence[];
}

export interface CreateAthleteEventInput {
  type: EventType;
  title: string;
  date: string;
  startTime?: string | null;
  durationMin?: number | null;
  allDay?: boolean;
  intensity?: EventIntensity | null;
  notes?: string | null;
  repeat?: EventRepeat | null;
}

// Editar: «solo este día» (occurrence) o «toda la serie» (series). Con occurrence,
// `occurrenceDate` es obligatoria y `date` NO se manda (la API v1 no deja mover una
// ocurrencia: 400); con series, `occurrenceDate` no se manda y `date` cambia el día de
// inicio de la serie (debe caer en uno de sus días si repite).
export interface UpdateAthleteEventInput extends Partial<CreateAthleteEventInput> {
  scope: EventScope;
  occurrenceDate?: string;
}
