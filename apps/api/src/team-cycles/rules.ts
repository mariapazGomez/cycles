// Reglas del ciclo del equipo (CYC-314). Puras: se prueban sin base.
//
// Las marcadas «POR CONFIRMAR» son la recomendación de Desarrollo para los puntos 1 a 7 del diseño
// (docs/diseno/ciclo-del-equipo). Cada una vive en una constante para cambiarla en un solo lugar.
import { startOfUtcDay } from "../common/training";

export const TEAM_RULES = {
  // POR CONFIRMAR (1): una sesión ajustada en la ficha del atleta deja de recibir cambios del equipo.
  detachedStopsReceiving: true,
  // POR CONFIRMAR (3): un cambio del equipo solo llega a sesiones de hoy en adelante.
  onlyFromToday: true,
  // POR CONFIRMAR (5): el equipo tiene un solo ciclo por fechas.
  oneCyclePerDates: true,
} as const;

export interface CopyState {
  status: "pending" | "completed" | "skipped";
  scheduledDate: Date | null;
  startedAt: Date | null;
  detachedAt: Date | null;
  deletedAt: Date | null;
  logs: number;
  feedback: number;
}

export type SkipReason = "adjusted" | "recorded" | "past" | "removed";

// ¿Por qué una copia NO recibe un cambio del equipo? null = lo recibe.
// POR CONFIRMAR (2): lo registrado (series, cierre, sesión empezada o hecha/omitida) nunca cambia.
export function skipReason(copy: CopyState, today: Date): SkipReason | null {
  if (copy.deletedAt) return "removed";
  if (copy.logs > 0 || copy.feedback > 0 || copy.startedAt || copy.status !== "pending") return "recorded";
  if (TEAM_RULES.detachedStopsReceiving && copy.detachedAt) return "adjusted";
  if (TEAM_RULES.onlyFromToday && copy.scheduledDate && startOfUtcDay(copy.scheduledDate) < startOfUtcDay(today)) return "past";
  return null;
}

export interface PropagationSummary {
  updated: number;
  skipped: { adjusted: number; recorded: number; past: number; removed: number };
}

export const emptySummary = (): PropagationSummary => ({ updated: 0, skipped: { adjusted: 0, recorded: 0, past: 0, removed: 0 } });

export function addToSummary(summary: PropagationSummary, reason: SkipReason | null): void {
  if (reason) summary.skipped[reason] += 1;
  else summary.updated += 1;
}

export type RemovalFate = "remove" | "keep_recorded" | "keep_adjusted" | "keep_past";

// Al sacar a un atleta (o eliminar el equipo o su ciclo, POR CONFIRMAR 6): se conserva lo
// registrado y lo ajustado; se quitan sus demás sesiones del ciclo del equipo de hoy en adelante.
export function removalFate(copy: CopyState, today: Date): RemovalFate {
  if (copy.logs > 0 || copy.feedback > 0 || copy.startedAt || copy.status !== "pending") return "keep_recorded";
  if (copy.detachedAt) return "keep_adjusted";
  if (copy.scheduledDate && startOfUtcDay(copy.scheduledDate) < startOfUtcDay(today)) return "keep_past";
  return "remove";
}

export function rangesOverlap(a: { startDate: Date; endDate: Date }, b: { startDate: Date; endDate: Date }): boolean {
  return startOfUtcDay(a.startDate) <= startOfUtcDay(b.endDate) && startOfUtcDay(b.startDate) <= startOfUtcDay(a.endDate);
}
