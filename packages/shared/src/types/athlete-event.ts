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

// Editar: «solo este día» (occurrence, con la fecha de esa ocurrencia) o «toda la serie».
export interface UpdateAthleteEventInput extends Partial<CreateAthleteEventInput> {
  scope: EventScope;
  occurrenceDate?: string;
}
