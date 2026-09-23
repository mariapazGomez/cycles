import type { TrainingCycle } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export function listCycles() {
  return apiRequest<TrainingCycle[]>("/cycles");
}

export function getCycle(id: string) {
  return apiRequest<TrainingCycle>(`/cycles/${id}`);
}

export function createCycle(data: {
  athleteId: string;
  name: string;
  objective?: string;
  startDate: string;
  endDate: string;
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
