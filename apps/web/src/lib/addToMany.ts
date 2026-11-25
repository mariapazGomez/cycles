import { calcLoadKg } from "@cycles/shared";

// «Agregar una rutina a varios atletas» (CYC-312): qué peso recibe cada atleta en cada ejercicio
// con % del RM, y a quién le falta el RM. A quien le falta se le agrega igual, con el % sin peso,
// y el coach recibe un aviso. Lógica pura para probarla con jest.

export interface PercentExercise {
  exerciseId: string;
  name: string;
  percent: number;
}

export interface CycleLike {
  id: string;
  athleteId: string;
  isTemplate?: boolean;
  startDate: string;
  endDate: string;
}

export interface Candidate {
  athleteId: string;
  name: string;
  // Invitación sin aceptar (solo en un equipo): la rutina lo omite hasta que acepte.
  pending?: boolean;
}

export interface PreviewRow {
  athleteId: string;
  name: string;
  // Ciclo del atleta que contiene la fecha; sin él no se le puede agregar la sesión.
  cycleId: string | null;
  cells: Array<{ exerciseId: string; kg: number | null }>;
  pending: boolean;
  // «Falta RM» si en algún ejercicio con % no tiene RM.
  missingRm: boolean;
}

const day = (iso: string) => iso.slice(0, 10);

// El ciclo del atleta (no plantilla) que contiene la fecha; si hay varios, el que empezó más tarde.
export function cycleForDate(cycles: CycleLike[], athleteId: string, date: string): CycleLike | null {
  const matches = cycles
    .filter((c) => !c.isTemplate && c.athleteId === athleteId && day(c.startDate) <= date && date <= day(c.endDate))
    .sort((a, b) => day(b.startDate).localeCompare(day(a.startDate)));
  return matches[0] ?? null;
}

export function buildPreview(input: {
  candidates: Candidate[];
  cycles: CycleLike[];
  date: string;
  percentExercises: PercentExercise[];
  // RM vigente en kg por atleta y ejercicio.
  rmByAthlete: Map<string, Map<string, number>>;
}): PreviewRow[] {
  return input.candidates.map((c) => {
    const rm = input.rmByAthlete.get(c.athleteId);
    const cells = input.percentExercises.map((e) => {
      const rmKg = rm?.get(e.exerciseId);
      return { exerciseId: e.exerciseId, kg: rmKg != null ? calcLoadKg(e.percent, rmKg) : null };
    });
    return {
      athleteId: c.athleteId,
      name: c.name,
      cycleId: c.pending ? null : (cycleForDate(input.cycles, c.athleteId, input.date)?.id ?? null),
      cells,
      pending: Boolean(c.pending),
      // Quien se omite no cuenta como «falta RM»: la rutina no le llega.
      missingRm: !c.pending && cells.some((cell) => cell.kg == null),
    };
  });
}

// «A 4 de 5 atletas les falta RM en algún ejercicio.»
export function missingRmCount(rows: PreviewRow[]): { missing: number; total: number } {
  return { missing: rows.filter((r) => r.missingRm).length, total: rows.length };
}

// La columna «Qué pasa» de cada atleta, con el mismo texto que el estado.
export function whatHappens(row: PreviewRow): { text: string; state: "ready" | "missing_rm" | "no_cycle" | "pending" } {
  if (row.pending) return { text: "Invitación pendiente: se omite", state: "pending" };
  if (row.cycleId == null) return { text: "No tiene ciclo: se omite", state: "no_cycle" };
  if (row.missingRm) return { text: "Recibe la rutina, falta su RM", state: "missing_rm" };
  return { text: "Recibe la rutina con su peso", state: "ready" };
}
