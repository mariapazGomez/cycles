import type { Exercise } from '@cycles/shared';

export const BODYWEIGHT_LABEL = 'Peso corporal';

// Un ejercicio de peso corporal no usa implementos: no se le pide ni se le muestra carga.
export function isBodyweight(exercise: Pick<Exercise, 'equipment'> | undefined | null): boolean {
  return exercise?.equipment?.includes('bodyweight') ?? false;
}
