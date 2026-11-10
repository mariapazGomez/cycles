import type { CycleStatus, CycleType, TrainingCycle } from "@cycles/shared";
import type { RoutineDetail } from "../services/routinesApi";
import { muscleGroupLabel } from "./muscleGroups";

// La Biblioteca reúne las rutinas y los ciclos del coach en una sola lista.
// Este módulo no toca la API: arma las filas y las filtra.

export type LibraryFilter = "all" | "routine" | "cycle";

export interface RoutineEntry {
  kind: "routine";
  id: string;
  name: string;
  groups: string[];
  exercises: number;
  sets: number;
}

export interface CycleEntry {
  kind: "cycle";
  id: string;
  name: string;
  athleteName: string | null;
  // Ciclo de la Biblioteca sin atleta: se puede asignar a varios.
  isTemplate: boolean;
  // El ciclo de un atleta salió de una plantilla que sigue en la Biblioteca.
  fromTemplate: boolean;
  status: CycleStatus;
  cycleType: CycleType;
  weeks: number;
  sessionsPerWeek: number | null;
}

export type LibraryEntry = RoutineEntry | CycleEntry;

// Valores del parámetro ?tipo= de /biblioteca.
export const FILTER_PARAM: Record<Exclude<LibraryFilter, "all">, string> = {
  routine: "rutinas",
  cycle: "ciclos",
};

export function filterFromParam(value: string | null): LibraryFilter {
  if (value === FILTER_PARAM.routine) return "routine";
  if (value === FILTER_PARAM.cycle) return "cycle";
  return "all";
}

export function libraryPath(filter: LibraryFilter = "all", create?: "ciclo" | "plantilla"): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("tipo", FILTER_PARAM[filter]);
  if (create) params.set("crear", create);
  const query = params.toString();
  return query ? `/biblioteca?${query}` : "/biblioteca";
}

// «Crear ciclo» de un atleta sin plan: lleva a su ficha y abre ahí el diálogo
// «Nuevo ciclo», con el atleta ya fijado (CYC-234). No pasa por la Biblioteca.
export function newCyclePath(athleteId: string): string {
  return `/athletes/${athleteId}?nuevo=ciclo`;
}

export const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

export const CYCLE_TYPE_LABEL: Record<CycleType, string> = {
  microcycle: "Microciclo",
  mesocycle: "Mesociclo",
  macrocycle: "Macrociclo",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Semanas que abarca el ciclo, contando el día de inicio y el de fin. Las
// fechas se guardan a medianoche UTC.
export function cycleWeeks(startDate: string, endDate: string): number {
  const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS) + 1;
  return Number.isFinite(days) && days > 0 ? Math.ceil(days / 7) : 0;
}

export function routineEntry(routine: RoutineDetail): RoutineEntry {
  const groups = [...new Set(routine.routineExercises.map((re) => muscleGroupLabel(re.exercise.muscleGroup)))];
  return {
    kind: "routine",
    id: routine.id,
    name: routine.name,
    groups,
    exercises: routine.routineExercises.length,
    sets: routine.routineExercises.reduce((sum, re) => sum + re.defaultSets, 0),
  };
}

export function cycleEntry(cycle: TrainingCycle, athleteNames: Map<string, string>): CycleEntry {
  return {
    kind: "cycle",
    id: cycle.id,
    name: cycle.name,
    athleteName: athleteNames.get(cycle.athleteId) ?? null,
    isTemplate: cycle.isTemplate,
    fromTemplate: Boolean(cycle.templateId),
    status: cycle.status,
    cycleType: cycle.cycleType,
    weeks: cycleWeeks(cycle.startDate, cycle.endDate),
    sessionsPerWeek: cycle.sessionsPerWeek ?? null,
  };
}

// Minúsculas y sin tildes, para que "pierna" encuentre "Pierna" y "Pérez".
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function searchText(entry: LibraryEntry): string {
  if (entry.kind === "routine") return [entry.name, ...entry.groups].join(" ");
  return [entry.name, entry.athleteName ?? ""].join(" ");
}

export function matchesSearch(entry: LibraryEntry, query: string): boolean {
  const needle = normalize(query.trim());
  return needle === "" || normalize(searchText(entry)).includes(needle);
}

export function countByFilter(entries: LibraryEntry[]): Record<LibraryFilter, number> {
  const routines = entries.filter((entry) => entry.kind === "routine").length;
  return { all: entries.length, routine: routines, cycle: entries.length - routines };
}

export function visibleEntries(entries: LibraryEntry[], filter: LibraryFilter, query: string): LibraryEntry[] {
  return entries
    .filter((entry) => filter === "all" || entry.kind === filter)
    .filter((entry) => matchesSearch(entry, query))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

// La página del constructor de rutinas (CYC-275): /routines/new o /routines/:id. `volver` es
// la dirección a la que regresar al guardar o cancelar (por ejemplo, la pizarra del ciclo).
export function routineBuilderPath(target: "new" | string, back?: string): string {
  const path = target === "new" ? "/routines/new" : `/routines/${encodeURIComponent(target)}`;
  const safe = safeBackPath(back ?? null);
  return safe ? `${path}?volver=${encodeURIComponent(safe)}` : path;
}

// Solo direcciones de esta misma aplicación: empiezan con una sola «/».
export function safeBackPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}
