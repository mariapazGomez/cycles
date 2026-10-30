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

export interface ExerciseForm {
  name: string;
  muscleGroup: MuscleGroup | null;
  equipment: Equipment[];
  description: string;
  videoUrl: string;
}

export const EMPTY_FORM: ExerciseForm = { name: "", muscleGroup: null, equipment: [], description: "", videoUrl: "" };

export function formFromExercise(exercise: Exercise): ExerciseForm {
  return {
    name: exercise.name,
    muscleGroup: exercise.muscleGroup ?? null,
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

// Filtra por pestaña (propios o catálogo), grupo y nombre. Los propios se
// ordenan alfabéticamente; el resto conserva el orden del servidor.
export function visibleExercises(
  exercises: Exercise[],
  coachId: string | undefined,
  tab: ExerciseTab,
  group: MuscleGroup | "all",
  search: string,
): Exercise[] {
  const needle = normalizeText(search);
  return exercises
    .filter((e) => (tab === "mine" ? e.createdBy === coachId : !e.createdBy))
    .filter((e) => group === "all" || (e.muscleGroup ?? "other") === group)
    .filter((e) => !needle || normalizeText(e.name).includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
