// Textos y formato de la carga como % del RM (CYC-311, diseño en docs/diseno/rm-porcentaje).
// Funciones puras para web y app. El peso ya viene calculado y redondeado desde la API
// (resolvedWeightKg); aquí solo se muestra. Siempre se guarda en kg: la unidad solo cambia lo que se ve.

export type RmDisplayUnit = "kg" | "lb";
export type RmDisplayStatus = "ok" | "missing" | "needs_athlete" | null | undefined;

const LB_PER_KG = 2.20462262185;
// Debe coincidir con ROUND_STEP_KG / ROUND_STEP_LB de la API (apps/api/src/common/max.ts).
export const RM_ROUND_STEP_KG = 2.5;
export const RM_ROUND_STEP_LB = 5;

// «72,5 kg» (coma decimal, sin ceros de más). En libras, «160 lb».
export function formatLoad(kg: number, unit: RmDisplayUnit = "kg"): string {
  const value = unit === "lb" ? Math.round(kg * LB_PER_KG * 10) / 10 : Math.round(kg * 100) / 100;
  return `${String(value).replace(".", ",")} ${unit}`;
}

// «80 % de tu RM» (al atleta) o «80 % RM» (en el selector del coach).
export function formatPercentOfRm(percent: number, opts: { short?: boolean } = {}): string {
  return opts.short ? `${percent} % RM` : `${percent} % de tu RM`;
}

// Comentario que ve el atleta: «Estás levantando el 80 % de tu RM».
export function athleteRmComment(percent: number): string {
  return `Estás levantando el ${formatPercentOfRm(percent)}`;
}

// «Peso redondeado a 2,5 kg para que calce con los discos» (a 5 lb si usa libras).
export function roundingNote(unit: RmDisplayUnit = "kg"): string {
  const step = unit === "lb" ? `${RM_ROUND_STEP_LB} lb` : `${String(RM_ROUND_STEP_KG).replace(".", ",")} kg`;
  return `Peso redondeado a ${step} para que calce con los discos`;
}

// Estado en texto (nunca solo color): «Lista» / «Falta RM». Null si la carga no es un %.
export function rmStatusLabel(status: RmDisplayStatus): "Lista" | "Falta RM" | null {
  if (status === "ok") return "Lista";
  if (status === "missing" || status === "needs_athlete") return "Falta RM";
  return null;
}

// Lo que ve el atleta en el registro de la serie. Con peso: meta «6 × 72,5 kg», comentario y nota.
// Sin peso calculado: «Aún no hay peso calculado» (registra el peso que use).
export function athleteLoadView(input: {
  percent: number;
  resolvedWeightKg: number | null;
  rmStatus: RmDisplayStatus;
  unit?: RmDisplayUnit;
  reps?: number | null;
}): { goal: string | null; comment: string; note: string | null; hasWeight: boolean } {
  const unit = input.unit ?? "kg";
  const hasWeight = input.rmStatus === "ok" && input.resolvedWeightKg != null;
  if (!hasWeight) return { goal: null, comment: "Aún no hay peso calculado", note: null, hasWeight: false };
  const load = formatLoad(input.resolvedWeightKg as number, unit);
  return {
    goal: input.reps != null ? `${input.reps} × ${load}` : load,
    comment: athleteRmComment(input.percent),
    note: roundingNote(unit),
    hasWeight: true,
  };
}

// Peso de un ejercicio con % del RM: % × RM redondeado a 2,5 kg (5 lb si usa libras). Es el mismo
// cálculo que hace la API; sirve para la vista previa de la rutina, antes de asignarla.
export function calcLoadKg(percent: number, rmKg: number, unit: RmDisplayUnit = "kg"): number {
  const raw = (percent / 100) * rmKg;
  if (unit === "lb") {
    const lb = Math.round((raw * LB_PER_KG) / RM_ROUND_STEP_LB) * RM_ROUND_STEP_LB;
    return Math.round((lb / LB_PER_KG) * 1000) / 1000;
  }
  return Math.round(raw / RM_ROUND_STEP_KG) * RM_ROUND_STEP_KG;
}
