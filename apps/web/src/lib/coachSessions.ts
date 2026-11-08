import type { TrainingCycle, TrainingSession } from "@cycles/shared";
import type { CycleProgress } from "../services/trackingApi";
import type { CoachSession } from "./loadClash";

// Sesiones del coach con día y volumen para el calendario del perfil (CYC-253). El día es el
// que el atleta eligió (`scheduledDate`); las que aún no tienen día (tentativas) no se dibujan.
// El volumen son las series planificadas de la sesión (suma de `target.sets`).
export function coachSessionsOf(sessions: TrainingSession[], progress: CycleProgress | undefined): CoachSession[] {
  const volume = new Map<string, number>();
  for (const s of progress?.sessions ?? []) {
    volume.set(s.id, s.exercises.reduce((n, e) => n + e.target.sets, 0));
  }
  return sessions
    .filter((s) => s.scheduledDate)
    .map((s) => ({ id: s.id, name: s.name, date: (s.scheduledDate as string).slice(0, 10), volume: volume.get(s.id) ?? 0 }));
}

// Ciclos del atleta que se cruzan con el rango visible (para pedir sus sesiones).
export function cyclesOverlapping(cycles: TrainingCycle[], from: string, to: string): TrainingCycle[] {
  return cycles.filter(
    (c) => !c.isTemplate && c.cycleType !== "macrocycle" && c.endDate.slice(0, 10) >= from && c.startDate.slice(0, 10) <= to,
  );
}
