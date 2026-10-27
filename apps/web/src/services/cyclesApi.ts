import type { CycleType, TrainingCycle } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export function listCycles() {
  return apiRequest<TrainingCycle[]>("/cycles");
}

// Solo las plantillas del coach (ciclos sin atleta de la Biblioteca).
export function listTemplates() {
  return apiRequest<TrainingCycle[]>("/cycles?templates=only");
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
