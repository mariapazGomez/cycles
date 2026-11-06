import type {
  AthleteEventOccurrence,
  AthleteEventSeries,
  AthleteEventsResponse,
  CreateAthleteEventInput,
  EventScope,
  UpdateAthleteEventInput,
} from '@cycles/shared';
import { apiRequest } from './httpClient';

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
