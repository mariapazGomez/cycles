// RM del atleta y carga como % del RM (CYC-306). Funciones puras: lo que habla con la
// base vive en MaxesService.
//
// El RM es el peso máximo a 1 repetición. Lo levantado en series NO es el RM.
// Siempre se guarda y se calcula en kg; solo el redondeo respeta la unidad del atleta.

// Paso de redondeo del peso calculado. Es un valor por defecto fácil de cambiar
// (la usuaria aún debe confirmar los 2,5 kg).
export const ROUND_STEP_KG = 2.5;
export const ROUND_STEP_LB = 5;
const LB_PER_KG = 2.20462262185;

export type WeightUnitName = "kg" | "lb";
export type RmStatus = "ok" | "missing" | "needs_athlete";

// Redondea `kg` al paso más cercano de la unidad del atleta y devuelve kg.
export function roundLoadKg(kg: number, unit: WeightUnitName = "kg"): number {
  if (unit === "lb") {
    const lb = Math.round((kg * LB_PER_KG) / ROUND_STEP_LB) * ROUND_STEP_LB;
    return Math.round((lb / LB_PER_KG) * 1000) / 1000;
  }
  return Math.round(kg / ROUND_STEP_KG) * ROUND_STEP_KG;
}

export interface ResolvedLoad {
  rmStatus: RmStatus | null;
  resolvedWeightKg: number | null;
}

// Peso de un ejercicio con carga en %. Sin % no hay nada que resolver (rmStatus nulo).
// `needs_athlete`: no hay atleta (rutina o plantilla). `missing`: el atleta no tiene RM en ese ejercicio.
// El RM congelado al registrar la primera serie gana al vigente.
export function resolveLoad(input: {
  percent: number | null;
  hasAthlete: boolean;
  frozenRmKg: number | null;
  currentRmKg: number | null;
  unit?: WeightUnitName;
}): ResolvedLoad {
  if (input.percent === null) return { rmStatus: null, resolvedWeightKg: null };
  if (!input.hasAthlete) return { rmStatus: "needs_athlete", resolvedWeightKg: null };
  const rm = input.frozenRmKg ?? input.currentRmKg;
  if (rm === null) return { rmStatus: "missing", resolvedWeightKg: null };
  return { rmStatus: "ok", resolvedWeightKg: roundLoadKg((rm * input.percent) / 100, input.unit ?? "kg") };
}
