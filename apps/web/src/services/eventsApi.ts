import type { AthleteEventsResponse } from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Actividades paralelas del atleta que ve su coach (CYC-253): solo lectura, solo con vínculo
// activo y sin las notas del atleta. La lista viene ya expandida por rango (máximo 92 días).
export function getAthleteEvents(athleteId: string, from: string, to: string) {
  return apiRequest<AthleteEventsResponse>(`/athletes/${athleteId}/events?from=${from}&to=${to}`);
}
