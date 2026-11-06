import type { ChartDefinition, ChartSize, SessionStatus, TrainingCycle } from "@cycles/shared";
import type { AthleteSummary, CycleProgress } from "../services/trackingApi";
import { currentCycle } from "./cycleSections";
import type { StarPoint } from "./starChart";

// Lógica de la pizarra de gráficos del Resumen del atleta (CYC-240, diseño
// docs/diseno/resumen-atleta). Funciones puras: qué ciclos y sesiones entran
// según el periodo, y las series de cada gráfico. Sin DOM.

export type Period = "cycle" | "four" | "all";

export const PERIOD_LABEL: Record<Period, string> = {
  cycle: "Ciclo actual",
  four: "Últimas 4 semanas",
  all: "Todo el historial",
};

// «Todo el historial» junta como máximo los últimos ciclos (cada uno es una consulta).
export const MAX_CYCLES = 5;
const DAY = 86_400_000;

const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

// Ciclos del atleta que entran en el periodo (los más antiguos primero).
export function chooseCycles(cycles: TrainingCycle[], period: Period, today: string): TrainingCycle[] {
  const own = cycles.filter((c) => !c.isTemplate && c.cycleType !== "macrocycle");
  if (period === "cycle") {
    const current = currentCycle(own, today);
    return current ? [current] : [];
  }
  const byStart = [...own].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (period === "all") return byStart.slice(-MAX_CYCLES);
  const from = isoDay(day(today) - 28 * DAY);
  return byStart.filter((c) => c.endDate.slice(0, 10) >= from && c.startDate.slice(0, 10) <= today);
}

export interface BoardSession {
  id: string;
  cycleName: string;
  name: string;
  // Lunes de su semana (aproximado: el ciclo parte en su fecha de inicio).
  date: string;
  weekNumber: number;
  slotNumber: number;
  status: SessionStatus;
  srpe: number | null;
  exercises: CycleProgress["sessions"][number]["exercises"];
}

export interface CycleEntry {
  cycle: TrainingCycle;
  progress: CycleProgress;
}

// Sesiones de los ciclos elegidos, en orden de fecha. Con «Últimas 4 semanas» se
// descartan las anteriores a hace 28 días.
export function boardSessions(entries: CycleEntry[], period: Period, today: string): BoardSession[] {
  const from = day(today) - 28 * DAY;
  const result: BoardSession[] = [];
  for (const { cycle, progress } of entries) {
    for (const s of progress.sessions) {
      const date = isoDay(day(cycle.startDate) + (s.weekNumber - 1) * 7 * DAY);
      if (period === "four" && day(date) < from - 6 * DAY) continue;
      result.push({
        id: s.id,
        cycleName: cycle.name,
        name: s.name,
        date,
        weekNumber: s.weekNumber,
        slotNumber: s.slotNumber,
        status: s.status,
        srpe: s.status === "completed" ? (s.feedback?.srpe ?? null) : null,
        exercises: s.exercises,
      });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.slotNumber - b.slotNumber);
}

// Semanas del resumen (carga y constancia) que entran en el periodo.
export function boardWeeks(weeks: AthleteSummary["weeks"], period: Period, cycle: TrainingCycle | null): AthleteSummary["weeks"] {
  if (period === "all") return weeks;
  if (period === "four") return weeks.slice(-4);
  if (!cycle) return [];
  const from = day(cycle.startDate) - 6 * DAY;
  const to = day(cycle.endDate);
  return weeks.filter((w) => day(w.weekStart) >= from && day(w.weekStart) <= to);
}

// ── Cifras de arriba ────────────────────────────────────────────────────────

const mapSets = (e: BoardSession["exercises"][number]) => e.actual.sets;

export interface Delta {
  planned: number;
  actual: number;
}

// Peso planificado y promedio cargado de un ejercicio en una sesión (null sin peso o sin series).
export function weightOf(e: BoardSession["exercises"][number]): Delta | null {
  const weights = mapSets(e).map((s) => s.weight).filter((w): w is number => w !== null);
  if (e.target.weight === null || weights.length === 0) return null;
  return { planned: e.target.weight, actual: mean(weights) };
}

export interface BoardStats {
  sessionsDone: number;
  sessionsTotal: number;
  // hechas ÷ (hechas + omitidas) de las sesiones ya pasadas; null si no hay.
  consistency: number | null;
  consistencyOf: number;
  avgEffort: number | null;
  // Promedio de (cargado − plan) en la última sesión de cada ejercicio; null sin datos.
  weightDelta: number | null;
}

export function boardStats(sessions: BoardSession[]): BoardStats {
  const done = sessions.filter((s) => s.status === "completed");
  const skipped = sessions.filter((s) => s.status === "skipped");
  const efforts = done.map((s) => s.srpe).filter((v): v is number => v !== null);
  const lastByExercise = new Map<string, Delta>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      const w = weightOf(e);
      if (w) lastByExercise.set(e.exercise.id, w);
    }
  }
  const deltas = [...lastByExercise.values()].map((d) => d.actual - d.planned);
  return {
    sessionsDone: done.length,
    sessionsTotal: sessions.length,
    consistency: done.length + skipped.length > 0 ? done.length / (done.length + skipped.length) : null,
    consistencyOf: done.length + skipped.length,
    avgEffort: efforts.length > 0 ? mean(efforts) : null,
    weightDelta: deltas.length > 0 ? mean(deltas) : null,
  };
}

// ── Gráfico estrella: peso y repeticiones por ejercicio ─────────────────────

export interface ExerciseOption {
  id: string;
  name: string;
  // Diferencia (cargado − plan) de la última sesión con peso; null si no hay plan de peso.
  lastDelta: number | null;
  sessions: number;
}

export function exerciseOptions(sessions: BoardSession[]): ExerciseOption[] {
  const map = new Map<string, ExerciseOption>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (mapSets(e).length === 0) continue;
      const entry = map.get(e.exercise.id) ?? { id: e.exercise.id, name: e.exercise.name, lastDelta: null, sessions: 0 };
      entry.sessions += 1;
      const w = weightOf(e);
      if (w) entry.lastDelta = w.actual - w.planned;
      map.set(e.exercise.id, entry);
    }
  }
  return [...map.values()];
}

// El que más se desvió del plan en su última sesión; si ninguno tiene plan de peso, el que más sesiones tiene.
export function defaultExercise(options: ExerciseOption[]): string | null {
  if (options.length === 0) return null;
  const withDelta = options.filter((o) => o.lastDelta !== null);
  if (withDelta.length > 0) return [...withDelta].sort((a, b) => Math.abs(b.lastDelta as number) - Math.abs(a.lastDelta as number))[0].id;
  return [...options].sort((a, b) => b.sessions - a.sessions)[0].id;
}

export function weightPoints(sessions: BoardSession[], exerciseId: string): StarPoint[] {
  const points: StarPoint[] = [];
  for (const s of sessions) {
    const e = s.exercises.find((x) => x.exercise.id === exerciseId);
    if (!e) continue;
    const sets = mapSets(e);
    const weights = sets.map((x) => x.weight).filter((w): w is number => w !== null);
    points.push({
      label: `Sem ${s.weekNumber}`,
      date: s.date,
      planned: e.target.weight,
      actual: weights.length > 0 ? Math.round(mean(weights) * 10) / 10 : null,
    });
  }
  return points;
}

export function repsPoints(sessions: BoardSession[], exerciseId: string): StarPoint[] {
  const points: StarPoint[] = [];
  for (const s of sessions) {
    const e = s.exercises.find((x) => x.exercise.id === exerciseId);
    if (!e) continue;
    const sets = mapSets(e);
    points.push({
      label: `Sem ${s.weekNumber}`,
      date: s.date,
      planned: e.target.reps,
      actual: sets.length > 0 ? Math.round(mean(sets.map((x) => x.reps)) * 10) / 10 : null,
    });
  }
  return points;
}

// Un ejercicio de peso corporal o sin peso planificado: el gráfico de pesos lo dice.
export function weightMode(points: StarPoint[]): "plan" | "no-plan" | "bodyweight" | "empty" {
  if (points.length === 0) return "empty";
  const hasPlan = points.some((p) => p.planned !== null);
  const hasActual = points.some((p) => p.actual !== null);
  if (hasPlan) return "plan";
  return hasActual ? "no-plan" : "bodyweight";
}

// ── Esfuerzo y RIR ──────────────────────────────────────────────────────────

export interface EffortPoint {
  label: string;
  date: string;
  value: number | null;
  status: SessionStatus;
}

// Una marca por sesión ya pasada; las omitidas y las pendientes dejan un hueco.
export function effortPoints(sessions: BoardSession[]): EffortPoint[] {
  return sessions
    .filter((s) => s.status !== "pending" || s.srpe !== null)
    .map((s) => ({ label: `Sem ${s.weekNumber}`, date: s.date, value: s.srpe, status: s.status }));
}

export type RirTone = "harder" | "easier" | "even";

export interface RirBar {
  id: string;
  name: string;
  // RIR planificado − RIR reportado: positivo = más duro de lo planificado.
  deviation: number;
  tone: RirTone;
}

export function rirBars(sessions: BoardSession[]): RirBar[] {
  const byExercise = new Map<string, { name: string; values: number[] }>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.target.rir === null || e.actual.reportedRir === null) continue;
      const entry = byExercise.get(e.exercise.id) ?? { name: e.exercise.name, values: [] };
      entry.values.push(e.target.rir - e.actual.reportedRir);
      byExercise.set(e.exercise.id, entry);
    }
  }
  return [...byExercise.entries()]
    .map(([id, v]) => {
      const deviation = Math.round(mean(v.values) * 10) / 10;
      return { id, name: v.name, deviation, tone: (deviation >= 1 ? "harder" : deviation <= -1 ? "easier" : "even") as RirTone };
    })
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

// ── Disposición ─────────────────────────────────────────────────────────────

// La definición de un gráfico es la de la API (@cycles/shared).
export type { ChartSize };
export type ChartDef = ChartDefinition;

export const SYSTEM_TITLES: Record<string, string> = {
  "plan-real": "Peso planificado contra el cargado",
  "progreso-ciclo": "Progreso del ciclo",
  constancia: "Constancia",
  esfuerzo: "Esfuerzo de cada sesión",
  "costo-ejercicio": "Cuánto costó cada ejercicio",
};

export function chartTitle(def: ChartDef): string {
  return def.titulo ?? SYSTEM_TITLES[def.id] ?? def.id;
}

// Lo que ve un coach que todavía no guardó nada (igual que `defaultLayout()` de la API) y
// a lo que vuelve «Restablecer disposición».
export const DEFAULT_LAYOUT: ChartDef[] = [
  { id: "plan-real", origen: "sistema", tamano: "completo", visible: true },
  { id: "progreso-ciclo", origen: "sistema", tamano: "mitad", visible: true },
  { id: "constancia", origen: "sistema", tamano: "mitad", visible: true },
  { id: "esfuerzo", origen: "sistema", tamano: "mitad", visible: true },
  { id: "costo-ejercicio", origen: "sistema", tamano: "mitad", visible: true },
];

// Gráficos a la vista, en el orden guardado; los del sistema desconocidos por esta versión se ignoran.
export function visibleCharts(layout: ChartDef[]): ChartDef[] {
  return layout.filter((c) => c.visible && (c.origen === "sistema" ? c.id in SYSTEM_TITLES : false));
}
