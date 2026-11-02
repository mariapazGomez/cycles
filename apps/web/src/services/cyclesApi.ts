import type { CycleType, TrainingCycle } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export function listCycles() {
  return apiRequest<TrainingCycle[]>("/cycles");
}

// Solo las plantillas del coach (ciclos sin atleta de la Biblioteca).
export function listTemplates() {
  return apiRequest<TrainingCycle[]>("/cycles?templates=only");
}

// Los ciclos de la Biblioteca: los de cada atleta y las plantillas sin asignar.
export function listLibraryCycles() {
  return apiRequest<TrainingCycle[]>("/cycles?templates=include");
}

export type RemovalResult = "deleted" | "archived";

// Quita el ciclo de un atleta; la plantilla de la que salió sigue en la Biblioteca.
// Con entrenamientos registrados se archiva en vez de borrarse.
export function unassignCycle(id: string) {
  return apiRequest<{ result: RemovalResult }>(`/cycles/${id}/unassign`, { method: "POST" });
}

export interface TemplateImpact {
  athletes: { athleteId: string; name: string; hasHistory: boolean }[];
}

export function getTemplateImpact(id: string) {
  return apiRequest<TemplateImpact>(`/cycles/templates/${id}/impact`);
}

// Elimina la plantilla y la quita de todos los atletas a los que está asignada.
export function removeTemplate(id: string) {
  return apiRequest<{ unassigned: number; archived: number }>(`/cycles/templates/${id}`, { method: "DELETE" });
}

// Copia una plantilla para un atleta, con fechas reales desde startDate.
export function assignTemplate(templateId: string, data: { athleteId: string; startDate: string }) {
  return apiRequest<TrainingCycle>(`/cycles/${templateId}/assign`, { method: "POST", body: data });
}

export function getCycle(id: string) {
  return apiRequest<TrainingCycle>(`/cycles/${id}`);
}

export function getChildren(id: string) {
  return apiRequest<TrainingCycle[]>(`/cycles/${id}/children`);
}

export function createCycle(data: {
  athleteId: string;
  name: string;
  objective?: string;
  startDate: string;
  endDate: string;
  cycleType: CycleType;
  sessionsPerWeek?: number;
  parentCycleId?: string;
}) {
  return apiRequest<TrainingCycle>("/cycles", {
    method: "POST",
    body: data,
  });
}

export function updateCycle(
  id: string,
  data: Partial<{
    name: string;
    objective: string;
    startDate: string;
    endDate: string;
    status: TrainingCycle["status"];
  }>,
) {
  return apiRequest<TrainingCycle>(`/cycles/${id}`, {
    method: "PATCH",
    body: data,
  });
}
