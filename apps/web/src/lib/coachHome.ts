// Lógica del Inicio del coach: qué atleta va primero, cómo se agrupan los
// avisos y en qué estado está cada atleta. Funciones puras, sin red.
import type { TrainingCycle } from "@cycles/shared";
import type { AthleteRelation } from "../services/athletesApi";
import type { AttentionItem, AttentionKind } from "../services/trackingApi";

export interface AttentionGroupData {
  athlete: { id: string; name: string };
  items: AttentionItem[];
}

// La API entrega los avisos ya ordenados por urgencia (dolor, carga alta,
// adherencia, carga baja); aquí se agrupan por atleta respetando ese orden.
export function groupByAthlete(items: AttentionItem[]): AttentionGroupData[] {
  const groups = new Map<string, AttentionGroupData>();
  for (const item of items) {
    const group = groups.get(item.athlete.id) ?? { athlete: item.athlete, items: [] };
    group.items.push(item);
    groups.set(item.athlete.id, group);
  }
  return [...groups.values()];
}

const FIRST_LINE: Record<AttentionKind, string> = {
  pain: "reportó dolor.",
  high_load: "una carga le costó más de lo planificado.",
  low_load: "una carga le quedó corta.",
  low_adherence: "dejó sesiones sin hacer.",
};

export function firstLine(kind: AttentionKind): string {
  return FIRST_LINE[kind];
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export type AthleteStatus = "attention" | "ok" | "no_plan" | "pending";

export interface AthleteRow {
  id: string;
  name: string;
  status: AthleteStatus;
  // Hay plan activo con sesiones esta semana: se mostrará su avance.
  hasPlan: boolean;
}

const STATUS_ORDER: AthleteStatus[] = ["attention", "ok", "no_plan", "pending"];

// Todos los atletas del coach en un solo lugar: primero los que necesitan
// atención (en el orden de la cola), luego el resto por nombre.
export function buildAthleteRows(
  relations: AthleteRelation[],
  cycles: TrainingCycle[],
  attentionOrder: string[],
): AthleteRow[] {
  const withActivePlan = new Set(cycles.filter((c) => c.status === "active").map((c) => c.athleteId));
  const needsAttention = new Set(attentionOrder);

  const rows: AthleteRow[] = relations
    .filter((r) => r.status !== "inactive")
    .map((r) => {
      const hasPlan = withActivePlan.has(r.athlete.id);
      const status: AthleteStatus =
        r.status === "pending"
          ? "pending"
          : needsAttention.has(r.athlete.id)
            ? "attention"
            : hasPlan
              ? "ok"
              : "no_plan";
      return { id: r.athlete.id, name: r.athlete.name, status, hasPlan };
    });

  return rows.sort((a, b) => {
    const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (byStatus !== 0) return byStatus;
    if (a.status === "attention") return attentionOrder.indexOf(a.id) - attentionOrder.indexOf(b.id);
    return a.name.localeCompare(b.name, "es");
  });
}

// Avance de la semana en curso: la última semana del resumen del atleta.
export function currentWeek(weeks: Array<{ assigned: number; completed: number }> | undefined) {
  const last = weeks?.[weeks.length - 1];
  return last && last.assigned > 0 ? { done: last.completed, of: last.assigned } : null;
}
