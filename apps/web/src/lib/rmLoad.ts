import { formatLoad, formatPercentOfRm, athleteLoadView, type RmDisplayStatus } from "@cycles/shared";
import { formatKg } from "./format";

// Lo mínimo de un ejercicio de sesión que importa para mostrar su carga (peso fijo o % del RM).
export interface LoadSource {
  targetWeight?: number | null;
  targetPercentRm?: number | null;
  rmStatus?: RmDisplayStatus;
  resolvedWeightKg?: number | null;
}

export function isPercentLoad(se: LoadSource): boolean {
  return se.targetPercentRm != null;
}

// Peso con el que se prellena el registro de una serie: el fijo o el calculado desde el RM.
export function effectiveTargetWeight(se: LoadSource): number | null {
  if (isPercentLoad(se)) return se.rmStatus === "ok" && se.resolvedWeightKg != null ? se.resolvedWeightKg : null;
  return se.targetWeight ?? null;
}

// Hoy: «72,5 kg» con RM; «75 % de tu RM» cuando aún no hay peso calculado; «Peso corporal» sin carga.
export function loadLabel(se: LoadSource): string {
  if (!isPercentLoad(se)) return formatKg(se.targetWeight);
  const weight = effectiveTargetWeight(se);
  return weight != null ? formatLoad(weight) : formatPercentOfRm(se.targetPercentRm as number);
}

// Registro de la serie: meta, comentario y nota del redondeo (o «Aún no hay peso calculado»).
export function percentLoadView(se: LoadSource, reps?: number) {
  return athleteLoadView({
    percent: se.targetPercentRm as number,
    resolvedWeightKg: se.resolvedWeightKg ?? null,
    rmStatus: se.rmStatus,
    reps,
  });
}
