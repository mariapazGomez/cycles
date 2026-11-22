import { athleteLoadView, formatLoad, formatPercentOfRm, type Exercise, type SessionExercise } from '@cycles/shared';
import { BODYWEIGHT_LABEL, isBodyweight } from './bodyweight';

// Carga de un ejercicio de la sesión tal como la ve el atleta (CYC-313, diseño en
// docs/diseno/rm-porcentaje). Textos y formato vienen de `@cycles/shared`, los mismos de la web.
// El backend manda «sin valor» como null: aquí se compara siempre con == null.
export type LoadItem = Pick<SessionExercise, 'targetReps' | 'targetWeight' | 'targetPercentRm' | 'rmStatus' | 'resolvedWeightKg'> & {
  exercise?: Pick<Exercise, 'equipment'> | null;
};

// El % del RM manda sobre el peso corporal: todos los ejercicios pueden tener RM.
export function percentOf(item: Pick<LoadItem, 'targetPercentRm'>): number | null {
  return item.targetPercentRm == null ? null : item.targetPercentRm;
}

export function isBodyweightLoad(item: LoadItem): boolean {
  return percentOf(item) === null && isBodyweight(item.exercise);
}

// Peso calculado desde el RM, o null si falta el RM (o no hay % en este ejercicio).
export function resolvedKg(item: LoadItem): number | null {
  const percent = percentOf(item);
  if (percent === null) {
    return null;
  }
  return athleteLoadView({ percent, resolvedWeightKg: item.resolvedWeightKg ?? null, rmStatus: item.rmStatus }).hasWeight
    ? (item.resolvedWeightKg as number)
    : null;
}

// Lo que va tras «4 × 6 · » en Hoy y en el detalle de la sesión; null si no hay carga que mostrar.
// Con RM: «72,5 kg». Con % y sin RM: «75 % de tu RM». Peso fijo: «60 kg». Peso corporal: «Peso corporal».
export function loadLabel(item: LoadItem): string | null {
  const percent = percentOf(item);
  if (percent !== null) {
    const kg = resolvedKg(item);
    return kg !== null ? formatLoad(kg) : formatPercentOfRm(percent);
  }
  if (isBodyweightLoad(item)) {
    return BODYWEIGHT_LABEL;
  }
  return item.targetWeight ? formatLoad(item.targetWeight) : null;
}

// «4 × 6 · 72,5 kg» (o sin la carga si no hay).
export function targetLine(item: LoadItem & { targetSets: number }): string {
  const label = loadLabel(item);
  return `${item.targetSets} × ${item.targetReps}${label ? ` · ${label}` : ''}`;
}

// Peso con el que parte el campo al registrar: el calculado, o el fijo, o 0 (nunca «null»).
export function prefillWeight(item: LoadItem): number {
  if (percentOf(item) !== null) {
    return resolvedKg(item) ?? 0;
  }
  return item.targetWeight ?? 0;
}
