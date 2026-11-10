import { useCallback, useRef, useState } from "react";
import type { Exercise } from "@cycles/shared";
import type { RoutineDetail } from "../services/routinesApi";
import { computeRoutineStats } from "../lib/routineStats";
import { toStatsRow } from "../lib/routineRows";
import {
  draftPayload,
  duplicateRowIn,
  moveRowIn,
  newRow,
  removeRowFrom,
  rowsFromRoutine,
  updateRowIn,
  validateDraft,
  type Row,
} from "../lib/routineDraft";

// El borrador de una rutina que el coach está armando (nombre y ejercicios con sus
// valores escritos). Lo comparten el cajón de la pizarra y el editor de la Biblioteca.
export function useRoutineDraft(initial: RoutineDetail | null = null) {
  const counter = useRef(0);
  const makeKey = useCallback(() => `row-${++counter.current}`, []);
  const [name, setName] = useState(initial?.name ?? "");
  const [rows, setRows] = useState<Row[]>(() => rowsFromRoutine(initial, makeKey));
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  // Llena el borrador con una rutina guardada (el editor la carga cuando llega de la API).
  const load = useCallback(
    (routine: RoutineDetail) => {
      setName(routine.name);
      setRows(rowsFromRoutine(routine, makeKey));
    },
    [makeKey],
  );

  // Devuelve la clave de la fila nueva, por si hay que llevar el cursor a ella.
  function addExercise(exercise: Exercise): string {
    const key = makeKey();
    setRows((current) => [...current, newRow(key, exercise)]);
    return key;
  }

  const updateRow = (key: string, patch: Partial<Row>) => setRows((current) => updateRowIn(current, key, patch));
  const removeRow = (key: string) => setRows((current) => removeRowFrom(current, key));
  const duplicateRow = (index: number) => setRows((current) => duplicateRowIn(current, index, makeKey()));
  const moveRow = (index: number, direction: -1 | 1) => setRows((current) => moveRowIn(current, index, direction));

  // Marca el intento de guardar y deja el primer problema en `error`. true = lista.
  function check(): boolean {
    setError(null);
    setAttempted(true);
    const problem = validateDraft(name, rows);
    if (problem) setError(problem);
    return problem === null;
  }

  return {
    name,
    setName,
    rows,
    error,
    setError,
    attempted,
    load,
    addExercise,
    updateRow,
    removeRow,
    duplicateRow,
    moveRow,
    check,
    payload: () => draftPayload(name, rows),
    stats: computeRoutineStats(rows.map(toStatsRow)),
  };
}
