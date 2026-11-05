import type { Equipment, Exercise, MuscleGroup } from "@cycles/shared";
import { MUSCLE_GROUP_LABEL } from "./muscleGroups";

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barra",
  plates: "Discos",
  dumbbells: "Mancuernas",
  kettlebell: "Kettlebell",
  bench: "Banco",
  rack: "Rack",
  cable: "Polea",
  machine: "Máquina",
  band: "Banda elástica",
  pullup_bar: "Barra de dominadas",
  dip_bars: "Paralelas",
  suspension: "Suspensión",
  medicine_ball: "Balón medicinal",
  box: "Cajón",
  bodyweight: "Peso corporal",
};

// «Peso corporal» va aparte: no se combina con los demás.
export const EQUIPMENT_OPTIONS = (Object.keys(EQUIPMENT_LABEL) as Equipment[]).filter((e) => e !== "bodyweight");

export const GROUP_OPTIONS = Object.keys(MUSCLE_GROUP_LABEL) as MuscleGroup[];

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Marcar «Peso corporal» desmarca el resto, y marcar otro implemento lo desmarca a él.
export function toggleEquipment(current: Equipment[], value: Equipment): Equipment[] {
  if (value === "bodyweight") {
    return current.includes("bodyweight") ? [] : ["bodyweight"];
  }
  const without = current.filter((e) => e !== "bodyweight");
  return without.includes(value) ? without.filter((e) => e !== value) : [...without, value];
}

// Marca o desmarca un grupo secundario. El principal no puede ser también secundario.
export function toggleSecondary(current: MuscleGroup[], value: MuscleGroup): MuscleGroup[] {
  return current.includes(value) ? current.filter((g) => g !== value) : [...current, value];
}

// Todos los grupos que trabaja un ejercicio: el principal y luego los secundarios.
export function exerciseGroups(exercise: Exercise): MuscleGroup[] {
  return [exercise.muscleGroup ?? "other", ...(exercise.secondaryMuscleGroups ?? [])];
}

export interface ExerciseForm {
  name: string;
  muscleGroup: MuscleGroup | null;
  secondaryMuscleGroups: MuscleGroup[];
  equipment: Equipment[];
  description: string;
  videoUrl: string;
}

export const EMPTY_FORM: ExerciseForm = { name: "", muscleGroup: null, secondaryMuscleGroups: [], equipment: [], description: "", videoUrl: "" };

export function formFromExercise(exercise: Exercise): ExerciseForm {
  return {
    name: exercise.name,
    muscleGroup: exercise.muscleGroup ?? null,
    secondaryMuscleGroups: exercise.secondaryMuscleGroups ?? [],
    equipment: exercise.equipment ?? [],
    description: exercise.description ?? "",
    videoUrl: exercise.videoUrl ?? "",
  };
}

export type FormErrors = Partial<Record<"name" | "muscleGroup" | "equipment" | "videoUrl", string>>;

export function validateForm(form: ExerciseForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Escribe el nombre del ejercicio.";
  if (!form.muscleGroup) errors.muscleGroup = "Elige un grupo muscular.";
  if (form.equipment.length === 0) errors.equipment = "Elige los implementos o marca «Peso corporal».";
  const video = form.videoUrl.trim();
  if (video && !/^https:\/\/\S+$/i.test(video)) errors.videoUrl = "Pega un enlace que empiece con https://";
  return errors;
}

export type ExerciseTab = "mine" | "catalog";

// Los siete grupos que tienen zona en el mapa del cuerpo; cardio y otro solo
// se eligen con los botones (CYC-231).
export const MAP_GROUPS: MuscleGroup[] = ["chest", "back", "legs", "glutes", "shoulders", "arms", "core"];

// Grupos elegidos en la dirección (?zonas=chest,core): solo los válidos, sin repetir.
export function parseZones(param: string | null): MuscleGroup[] {
  if (!param) return [];
  const seen = new Set<MuscleGroup>();
  for (const part of param.split(",")) {
    if ((GROUP_OPTIONS as string[]).includes(part)) seen.add(part as MuscleGroup);
  }
  return GROUP_OPTIONS.filter((g) => seen.has(g));
}

export function toggleGroup(current: MuscleGroup[], group: MuscleGroup): MuscleGroup[] {
  return current.includes(group) ? current.filter((g) => g !== group) : [...current, group];
}

// «Pecho o Core»
export function groupsLabel(groups: MuscleGroup[]): string {
  return groups.map((g) => MUSCLE_GROUP_LABEL[g]).join(" o ");
}

function inTab(e: Exercise, coachId: string | undefined, tab: ExerciseTab): boolean {
  return tab === "mine" ? e.createdBy === coachId : !e.createdBy;
}

function matchesName(e: Exercise, search: string): boolean {
  const needle = normalizeText(search);
  return !needle || normalizeText(e.name).includes(needle);
}

// Filtra por pestaña (propios o catálogo), grupos y nombre. Con grupos elegidos
// basta con que el ejercicio trabaje alguno (como principal o secundario). Salen
// primero los que lo trabajan como principal; dentro de cada bloque, alfabético.
export function visibleExercises(
  exercises: Exercise[],
  coachId: string | undefined,
  tab: ExerciseTab,
  groups: MuscleGroup[],
  search: string,
): Exercise[] {
  const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, "es");
  const found = exercises
    .filter((e) => inTab(e, coachId, tab))
    .filter((e) => groups.length === 0 || exerciseGroups(e).some((g) => groups.includes(g)))
    .filter((e) => matchesName(e, search));
  if (groups.length === 0) return found.sort(byName);
  const primary = found.filter((e) => groups.includes(e.muscleGroup ?? "other")).sort(byName);
  const rest = found.filter((e) => !groups.includes(e.muscleGroup ?? "other")).sort(byName);
  return [...primary, ...rest];
}

// ¿Este ejercicio aparece solo porque lo trabaja como secundario?
export function onlySecondary(exercise: Exercise, groups: MuscleGroup[]): boolean {
  return groups.length > 0 && !groups.includes(exercise.muscleGroup ?? "other");
}

// Cuántos ejercicios de la pestaña y la búsqueda actuales trabaja cada grupo.
export function groupCounts(
  exercises: Exercise[],
  coachId: string | undefined,
  tab: ExerciseTab,
  search: string,
): Record<MuscleGroup, number> {
  const counts = Object.fromEntries(GROUP_OPTIONS.map((g) => [g, 0])) as Record<MuscleGroup, number>;
  for (const e of exercises) {
    if (!inTab(e, coachId, tab) || !matchesName(e, search)) continue;
    for (const g of new Set(exerciseGroups(e))) counts[g] += 1;
  }
  return counts;
}
