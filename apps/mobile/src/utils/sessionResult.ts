// Resultado de la sesión que la app propone según las series registradas.
// 'partial' existe solo en la interfaz: el backend admite completed y skipped,
// así que una sesión parcial se envía como completed con una nota.
export type SessionResult = 'completed' | 'partial' | 'skipped';

export function deduceResult(doneSets: number, plannedSets: number): SessionResult {
  if (doneSets <= 0) {
    return 'skipped';
  }
  return doneSets >= plannedSets ? 'completed' : 'partial';
}

export function effortLabel(value: number): string {
  if (value <= 2) {
    return 'Muy suave';
  }
  if (value <= 4) {
    return 'Suave';
  }
  if (value <= 6) {
    return 'Moderada';
  }
  if (value <= 8) {
    return 'Dura';
  }
  return 'Máxima';
}

export const REASONS = ['Falta de tiempo', 'Cansancio', 'Molestia', 'Otro'] as const;

// Arma la nota que se guarda en el backend. El motivo y la parcialidad van
// al inicio, antes de lo que el atleta haya escrito.
export function buildNotes(params: {
  result: SessionResult;
  doneSets: number;
  plannedSets: number;
  reason: string | null;
  notes: string;
}): string | undefined {
  const { result, doneSets, plannedSets, reason, notes } = params;
  const parts: string[] = [];
  if (result === 'partial') {
    parts.push(`Sesión parcial: ${doneSets} de ${plannedSets} series.`);
  }
  if (result !== 'completed' && reason) {
    parts.push(`Motivo: ${reason}.`);
  }
  if (notes.trim() !== '') {
    parts.push(notes.trim());
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}
