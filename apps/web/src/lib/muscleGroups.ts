import type { MuscleGroup } from "@cycles/shared";

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  glutes: "Glúteos",
  shoulders: "Hombros",
  arms: "Brazos",
  core: "Core",
  cardio: "Cardio",
  other: "Otro",
};

export function muscleGroupLabel(group: MuscleGroup | undefined): string {
  return MUSCLE_GROUP_LABEL[group ?? "other"];
}
