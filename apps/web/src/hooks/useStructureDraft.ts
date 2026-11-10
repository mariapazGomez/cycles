import { useCallback, useRef, useState } from "react";
import type { Exercise, WorkBlockType } from "@cycles/shared";
import type { RoutineDetail } from "../services/routinesApi";
import type { SessionDetail } from "../services/sessionsApi";
import { SESSION_MESSAGES, hasLoggedRows, sessionPayload, structureFromSession, validateSessionStructure } from "../lib/sessionDraft";
import {
  addBlock,
  canMoveInBlock,
  groupLoose,
  moveBlock,
  moveRowInBlock,
  moveRowToBlock,
  placeRow,
  reorderBlocks,
  removeBlock,
  structureFromRoutine,
  structurePayload,
  structureSignature,
  structureStats,
  structureView,
  updateBlock,
  validateStructure,
  type DraftBlock,
  type Structure,
} from "../lib/blocksDraft";
import { duplicateRowIn, newRow, removeRowFrom, updateRowIn, type Row } from "../lib/routineDraft";

interface UndoState {
  message: string;
  snapshot: Structure;
}

// El borrador de una rutina con sus bloques mientras el coach la arma (CYC-275). Lo usa la
// página del constructor; la lógica está en lib/blocksDraft.ts.
export function useStructureDraft(initial: RoutineDetail | null = null, mode: "routine" | "session" = "routine") {
  const counter = useRef(0);
  const makeKey = useCallback(() => `n-${++counter.current}`, []);
  const [name, setName] = useState(initial?.name ?? "");
  const [structure, setStructure] = useState<Structure>(() => structureFromRoutine(initial, makeKey));
  const baseline = useRef(structureSignature(initial?.name ?? "", structureFromRoutine(initial, () => "x")));
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);

  // Llena el borrador con la rutina guardada (cuando llega de la API) y fija lo «sin cambios».
  const load = useCallback(
    (routine: RoutineDetail) => {
      const next = structureFromRoutine(routine, makeKey);
      setName(routine.name);
      setStructure(next);
      baseline.current = structureSignature(routine.name, structureFromRoutine(routine, () => "x"));
    },
    [makeKey],
  );

  // Una sesión ya cargada (modo sesión): con los ids de sus ejercicios y bloques.
  const loadSession = useCallback(
    (session: SessionDetail) => {
      setName(session.name);
      setStructure(structureFromSession(session, makeKey));
      baseline.current = structureSignature(session.name, structureFromSession(session, () => "x"));
      setError(null);
    },
    [makeKey],
  );

  const edit = (fn: (s: Structure) => Structure) => {
    setUndo(null);
    setStructure(fn);
  };
  const editWithUndo = (message: string, fn: (s: Structure) => Structure) => {
    setStructure((current) => {
      setUndo({ message, snapshot: current });
      return fn(current);
    });
  };

  return {
    name,
    setName,
    structure,
    views: structureView(structure),
    error,
    setError,
    attempted,
    undo,
    dismissUndo: () => setUndo(null),
    doUndo: () => {
      if (undo) setStructure(undo.snapshot);
      setUndo(null);
    },
    dirty: structureSignature(name, structure) !== baseline.current,
    markSaved: () => {
      baseline.current = structureSignature(name, structure);
    },
    load,
    loadSession,

    addExercise: (exercise: Exercise, blockKey: string | null): string => {
      const key = makeKey();
      edit((s) => ({ ...s, rows: [...s.rows, { ...newRow(key, exercise), blockId: blockKey }] }));
      return key;
    },
    updateRow: (key: string, patch: Partial<Row>) => setStructure((s) => ({ ...s, rows: updateRowIn(s.rows, key, patch) })),
    duplicateRow: (key: string) => edit((s) => ({ ...s, rows: duplicateRowIn(s.rows, s.rows.findIndex((r) => r.key === key), makeKey()) })),
    removeRow: (key: string) => {
      // Un ejercicio con series registradas no se quita (la API tampoco lo deja).
      if (structure.rows.some((r) => r.key === key && (r.loggedCount ?? 0) > 0)) return setError(SESSION_MESSAGES.removeLogged);
      editWithUndo("Ejercicio quitado.", (s) => ({ ...s, rows: removeRowFrom(s.rows, key) }));
    },
    moveRowInBlock: (key: string, direction: -1 | 1) => edit((s) => moveRowInBlock(s, key, direction)),
    canMoveRow: (key: string, direction: -1 | 1) => canMoveInBlock(structure, key, direction),
    moveRowToBlock: (key: string, blockKey: string | null) => edit((s) => moveRowToBlock(s, key, blockKey)),

    // Arrastre: soltar un ejercicio en una posición de un bloque, o reordenar un bloque.
    dropRow: (key: string, blockKey: string | null, index: number) => edit((s) => placeRow(s, key, blockKey, index)),
    dropBlock: (from: number, to: number) => edit((s) => reorderBlocks(s, from, to)),

    addBlock: (type: WorkBlockType): string => {
      const key = makeKey();
      edit((s) => addBlock(s, type, key));
      return key;
    },
    updateBlock: (key: string, patch: Partial<Omit<DraftBlock, "key" | "id">>) => setStructure((s) => updateBlock(s, key, patch)),
    removeBlock: (key: string, label: string) => {
      if (hasLoggedRows(structure.rows.filter((r) => r.blockId === key))) return setError(SESSION_MESSAGES.removeBlockLogged);
      editWithUndo(`Bloque «${label}» quitado.`, (s) => removeBlock(s, key));
    },
    moveBlock: (key: string, direction: -1 | 1) => edit((s) => moveBlock(s, key, direction)),
    groupLoose: () => edit((s) => groupLoose(s, makeKey())),

    // Marca el intento de guardar y deja el primer problema en `error`. true = lista.
    check: (): boolean => {
      setError(null);
      setAttempted(true);
      const problem = mode === "session" ? validateSessionStructure(name, structure) : validateStructure(name, structure);
      if (problem) setError(problem);
      return problem === null;
    },
    payload: () => structurePayload(name, structure),
    sessionPayload: () => sessionPayload(structure),
    stats: structureStats(structure),
  };
}
