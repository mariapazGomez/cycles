// Cálculos de la carga de una rutina para el panel del constructor. Son
// estimaciones: el volumen es series × reps × carga y la duración suma, por
// serie, el tiempo de trabajo más el descanso.

export const WORK_SECONDS_PER_SET = 40;

// Lo que el coach tiene escrito en una fila. Todo llega como texto de los inputs.
export interface RowDraft {
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  rir: string;
  group: string;
}

// Acepta coma o punto decimal. Vacío o inválido da NaN.
export function parseNumber(value: string): number {
  const text = value.trim().replace(",", ".");
  return text === "" ? NaN : Number(text);
}

function isPositiveInt(value: string): boolean {
  const n = parseNumber(value);
  return Number.isInteger(n) && n > 0;
}

// Series y reps son obligatorias y enteras: lo mismo que exige la API.
export function isRowComplete(row: Pick<RowDraft, "sets" | "reps">): boolean {
  return isPositiveInt(row.sets) && isPositiveInt(row.reps);
}

export interface RoutineStats {
  sets: number;
  volumeKg: number;
  durationMinutes: number;
  averageRir: number | null;
  setsByGroup: Array<{ group: string; sets: number }>;
  incompleteCount: number;
}

export function computeRoutineStats(rows: RowDraft[]): RoutineStats {
  let sets = 0;
  let volumeKg = 0;
  let seconds = 0;
  let rirSum = 0;
  let rirCount = 0;
  let incompleteCount = 0;
  const byGroup = new Map<string, number>();

  for (const row of rows) {
    if (!isRowComplete(row)) {
      incompleteCount += 1;
      continue;
    }
    const rowSets = parseNumber(row.sets);
    const reps = parseNumber(row.reps);
    const weight = parseNumber(row.weight);
    const rest = parseNumber(row.restSeconds);
    sets += rowSets;
    volumeKg += rowSets * reps * (Number.isFinite(weight) && weight > 0 ? weight : 0);
    seconds += rowSets * (WORK_SECONDS_PER_SET + (Number.isFinite(rest) && rest > 0 ? rest : 0));
    byGroup.set(row.group, (byGroup.get(row.group) ?? 0) + rowSets);
    if (row.rir !== "") {
      rirSum += Number(row.rir);
      rirCount += 1;
    }
  }

  return {
    sets,
    volumeKg,
    durationMinutes: sets === 0 ? 0 : Math.max(1, Math.round(seconds / 60)),
    averageRir: rirCount === 0 ? null : rirSum / rirCount,
    setsByGroup: [...byGroup.entries()]
      .map(([group, groupSets]) => ({ group, sets: groupSets }))
      .sort((a, b) => b.sets - a.sets),
    incompleteCount,
  };
}
