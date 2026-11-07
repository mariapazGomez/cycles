import type {
  AthleteEventOccurrence,
  AthleteEventSeries,
  AthleteEventsResponse,
  CreateAthleteEventInput,
  EventScope,
  UpdateAthleteEventInput,
} from '@cycles/shared';
import { ApiError, apiRequest } from './httpClient';

export type { AthleteEventOccurrence, AthleteEventSeries, CreateAthleteEventInput, EventScope, UpdateAthleteEventInput };

// Actividades paralelas del atleta (CYC-252): /me/events. La API responde `{ events: [...] }`
// con la repetición ya expandida por rango. Se acepta también una lista suelta y cualquier
// otra forma se trata como «sin actividades» para no tumbar la pantalla (lección de CYC-249).
export async function fetchEvents(from: string, to: string): Promise<AthleteEventOccurrence[]> {
  const body = await apiRequest<Partial<AthleteEventsResponse> | AthleteEventOccurrence[]>(
    `/me/events?from=${from}&to=${to}`,
  );
  const list = Array.isArray(body) ? body : body?.events;
  return Array.isArray(list) ? list : [];
}

export function createEvent(input: CreateAthleteEventInput) {
  return apiRequest<AthleteEventSeries>('/me/events', { method: 'POST', body: input });
}

export function updateEvent(seriesId: string, input: UpdateAthleteEventInput) {
  return apiRequest<AthleteEventSeries>(`/me/events/${seriesId}`, { method: 'PATCH', body: input });
}

export function deleteEvent(seriesId: string, scope: EventScope, occurrenceDate?: string) {
  const query = scope === 'occurrence' && occurrenceDate ? `?scope=occurrence&date=${occurrenceDate}` : '?scope=series';
  return apiRequest<unknown>(`/me/events/${seriesId}${query}`, { method: 'DELETE' });
}

// Mensaje para la persona cuando falla guardar, editar o borrar (CYC-251: 400 validación,
// 404 la actividad no es tuya o ya no existe, 403 un coach en /me/events, tope de 200).
export function describeEventError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return 'Esa actividad ya no existe. Actualiza el calendario.';
    }
    if (err.status === 403) {
      return 'Esta cuenta no puede agregar actividades.';
    }
    if (err.status === 400 || err.status === 422) {
      return err.message || 'Revisa los datos de la actividad.';
    }
    if (err.status === 401) {
      return 'Tu sesión terminó. Vuelve a entrar.';
    }
  }
  return 'No pudimos guardar la actividad. Revisa tu conexión e inténtalo de nuevo.';
}
