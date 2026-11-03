import type { TourStatus } from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Guarda si la persona saltó o terminó la guía (o la vuelve a abrir con «pending»).
export function setTourStatus(status: TourStatus) {
  return apiRequest<void>("/users/me/tour", { method: "PATCH", body: { status } });
}
