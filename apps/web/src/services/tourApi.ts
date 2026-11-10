import type { TourStatus } from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Guarda si la persona saltó o terminó la guía (o la vuelve a abrir con «pending»).
export function setTourStatus(status: TourStatus) {
  return apiRequest<void>("/users/me/tour", { method: "PATCH", body: { status } });
}

// Marca una novedad como vista (`clave@version`). Es idempotente.
export function markNewsSeen(key: string) {
  return apiRequest<void>("/users/me/news-seen", { method: "POST", body: { key } });
}
