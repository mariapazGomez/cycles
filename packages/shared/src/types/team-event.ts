// Eventos del equipo (CYC-316 diseño, CYC-317 API): el coach los crea una vez y cada atleta del
// equipo los lee. No se copian a sus actividades: se leen por pertenecer al equipo, así que quien
// sale deja de verlos. Fechas «AAAA-MM-DD»; horas «HH:mm».
import type { AthleteEventOccurrence, EventRepeat, EventType } from "./athlete-event";

// Los tipos del diseño: los de las actividades del atleta sin «lesión».
export type TeamEventType = Exclude<EventType, "injury">;

// La serie completa (POST y PATCH la devuelven). Editar o eliminar cambia todas sus repeticiones.
export interface TeamEventSeries {
  id: string;
  teamId: string;
  type: TeamEventType;
  title: string;
  // Día de inicio de la serie.
  date: string;
  startTime: string | null;
  durationMin: number | null;
  allDay: boolean;
  // La ven todos los atletas del equipo: no debe llevar datos de salud (R7).
  notes: string | null;
  repeat: EventRepeat | null;
}

// Una ocurrencia ya expandida dentro del rango pedido.
export interface TeamEventOccurrence extends Omit<TeamEventSeries, "id" | "date"> {
  seriesId: string;
  // Día de esta ocurrencia.
  date: string;
  // Día de inicio de la serie: lo que se edita.
  seriesDate: string;
  teamName: string;
}

// GET /teams/:id/events (coach dueño) y GET /me/team-events (atleta).
export interface TeamEventsResponse {
  events: TeamEventOccurrence[];
}

export interface CreateTeamEventInput {
  type: TeamEventType;
  title: string;
  date: string;
  startTime?: string | null;
  durationMin?: number | null;
  allDay?: boolean;
  notes?: string | null;
  repeat?: EventRepeat | null;
}

export type UpdateTeamEventInput = Partial<CreateTeamEventInput>;

// GET /teams/:id/calendar: los eventos del equipo y las actividades de sus atletas con relación
// activa. En estas `notes` llega SIEMPRE en null: son privadas del atleta (R7). Las sesiones no
// vienen aquí.
export interface TeamCalendarResponse {
  teamEvents: TeamEventOccurrence[];
  athleteEvents: (AthleteEventOccurrence & { athleteId: string; athleteName: string })[];
}

// GET /teams/:id/rankings?period=weeks4|cycle: sesiones completadas sobre las asignadas.
export type RankingPeriod = "weeks4" | "cycle";

export interface TeamRankingRow {
  athleteId: string;
  name: string;
  // pending: invitación sin aceptar; inactive: la relación terminó. Ninguno trae cifras.
  status: "active" | "pending" | "inactive";
  assigned: number;
  completed: number;
  // null cuando no tiene sesiones asignadas en el período.
  percent: number | null;
}

export interface TeamRankingsResponse {
  period: RankingPeriod;
  rows: TeamRankingRow[];
}
