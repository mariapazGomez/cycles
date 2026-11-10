import type { Exercise } from "@cycles/shared";
import type { RoutineWorkBlock, RoutineStructureInput } from "@cycles/shared";
import type { RoutineDetail } from "../services/routinesApi";
import { isRowComplete, type RoutineStats } from "./routineStats";
import { formatInteger } from "./format";
import { DEFAULT_SETS, rowFromRoutine, toInput, type Row } from "./routineRows";

// Lógica pura del borrador de una rutina (CYC-275): la usan el cajón y el editor de
// la Biblioteca a través de useRoutineDraft. Sin DOM, para probarla con jest.
export type { Row };

export const DRAFT_MESSAGES = {
  name: "Ponle un nombre a la rutina.",
  empty: "Agrega al menos un ejercicio.",
  incomplete: "Completa series y reps de todos los ejercicios.",
  save: "No se pudo guardar la rutina.",
} as const;

export function newRow(key: string, exercise: Exercise): Row {
  return {
    key,
    exerciseId: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sets: DEFAULT_SETS,
    reps: "",
    weight: "",
    restSeconds: "",
    rir: "",
    note: "",
    blockId: null,
  };
}

export function rowsFromRoutine(routine: RoutineDetail | null | undefined, makeKey: () => string): Row[] {
  return (routine?.routineExercises ?? []).map((re) => rowFromRoutine(makeKey(), re));
}

export function updateRowIn(rows: Row[], key: string, patch: Partial<Row>): Row[] {
  return rows.map((row) => (row.key === key ? { ...row, ...patch } : row));
}

export function removeRowFrom(rows: Row[], key: string): Row[] {
  return rows.filter((row) => row.key !== key);
}

// La copia queda justo debajo del original.
export function duplicateRowIn(rows: Row[], index: number, key: string): Row[] {
  if (index < 0 || index >= rows.length) return rows;
  return [...rows.slice(0, index + 1), { ...rows[index], key }, ...rows.slice(index + 1)];
}

// Un ejercicio se mueve dentro de su bloque: al guardar, cada bloque lleva sus ejercicios, así
// que cruzar de bloque con las flechas no se vería igual que queda guardado.
export function canMoveRow(rows: Row[], index: number, direction: -1 | 1): boolean {
  const target = index + direction;
  return index >= 0 && index < rows.length && target >= 0 && target < rows.length && rows[target].blockId === rows[index].blockId;
}

export function moveRowIn(rows: Row[], index: number, direction: -1 | 1): Row[] {
  const target = index + direction;
  if (!canMoveRow(rows, index, direction)) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// El primer problema que impide guardar, o null si la rutina está lista.
export function validateDraft(name: string, rows: Row[]): string | null {
  if (!name.trim()) return DRAFT_MESSAGES.name;
  if (rows.length === 0) return DRAFT_MESSAGES.empty;
  if (rows.some((row) => !isRowComplete(row))) return DRAFT_MESSAGES.incomplete;
  return null;
}

// Lo que se guarda: los bloques de la rutina en orden con sus ejercicios, y los sueltos al
// final. Una rutina sin bloques manda solo `exercises`, como siempre.
export function draftPayload(name: string, rows: Row[], blocks: RoutineWorkBlock[] = []): RoutineStructureInput & { name: string } {
  const inBlock = (id: string) => rows.filter((row) => row.blockId === id).map(toInput);
  const known = new Set(blocks.map((b) => b.id));
  const loose = rows.filter((row) => !row.blockId || !known.has(row.blockId)).map(toInput);
  if (blocks.length === 0) return { name: name.trim(), exercises: loose };
  return {
    name: name.trim(),
    blocks: [...blocks]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((b) => ({
        id: b.id,
        type: b.type,
        name: b.name,
        ...(b.color ? { color: b.color } : {}),
        ...(b.note ? { note: b.note } : {}),
        exercises: inBlock(b.id),
      })),
    exercises: loose,
  };
}

// «7 series · ~24 min · 2.400 kg» (vacío mientras no haya series completas).
export function routineSummaryLine(stats: Pick<RoutineStats, "sets" | "durationMinutes" | "volumeKg">): string {
  if (stats.sets <= 0) return "";
  return `${formatInteger(stats.sets)} ${stats.sets === 1 ? "serie" : "series"} · ~${formatInteger(stats.durationMinutes)} min · ${formatInteger(stats.volumeKg)} kg`;
}
