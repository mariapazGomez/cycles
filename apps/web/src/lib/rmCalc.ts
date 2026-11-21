// RM aproximado con la fórmula de Epley (CYC-312, docs/diseno/rm-porcentaje):
//   RM ≈ peso × (1 + repeticiones ÷ 30)
// Solo lo decide y confirma el coach; nada se guarda solo. Funciones puras.
import { formatNumber } from "./format";

const FACTOR = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });

export const EPLEY_MIN_REPS = 1;
export const EPLEY_MAX_REPS = 15;
// Con más de 10 repeticiones el resultado es poco preciso: se avisa.
export const EPLEY_PRECISE_MAX_REPS = 10;

export interface EpleyResult {
  rmKg: number;
  // El factor (1 + reps ÷ 30) redondeado a 2 decimales, para mostrar la cuenta paso a paso.
  factor: number;
  imprecise: boolean;
}

// Al 0,5 kg más cercano. Con 1 repetición el RM es el propio peso.
export function epleyRm(weightKg: number, reps: number): EpleyResult | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000) return null;
  if (!Number.isInteger(reps) || reps < EPLEY_MIN_REPS || reps > EPLEY_MAX_REPS) return null;
  const raw = reps === 1 ? weightKg : weightKg * (1 + reps / 30);
  return {
    rmKg: Math.round(raw * 2) / 2,
    factor: Math.round((1 + reps / 30) * 100) / 100,
    imprecise: reps > EPLEY_PRECISE_MAX_REPS,
  };
}

// «60 × (1 + 10 ÷ 30) = 60 × 1,33 = 80 kg»
export function epleyStepsText(weightKg: number, reps: number, result: EpleyResult): string {
  const w = formatNumber(weightKg);
  if (reps === 1) return `Con 1 repetición el RM es el propio peso: ${w} kg`;
  return `${w} × (1 + ${reps} ÷ 30) = ${w} × ${FACTOR.format(result.factor)} = ${formatNumber(result.rmKg)} kg`;
}
