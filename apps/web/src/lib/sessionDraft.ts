import type { ExerciseLog, SessionExerciseStructureInput, SessionStructureInput, SessionStatus } from "@cycles/shared";
import type { SessionDetail, SessionExerciseWithExercise } from "../services/sessionsApi";
import { BLOCK_NAME_MAX, MAX_BLOCKS, STRUCTURE_MESSAGES, type DraftBlock, type Structure } from "./blocksDraft";
import { isRowComplete, parseNumber } from "./routineStats";
import { toText, type Row } from "./routineRows";

// La sesión del coach en el constructor (CYC-275, PR 3): conversión entre la sesión que
// devuelve la API y el borrador, y el cuerpo que se guarda. Lógica pura para probarla con jest.

// «3 × 8 a 62 kg» si todas las series fueron iguales; si no, «3 series».
export function loggedResult(logs: ExerciseLog[] | undefined): string | undefined {
  if (!logs || logs.length === 0) return undefined;
  const first = logs[0];
  const same = logs.every((l) => l.actualReps === first.actualReps && l.actualWeight === first.actualWeight);
  if (!same) return `Registró ${logs.length} ${logs.length === 1 ? "serie" : "series"}`;
  const kg = first.actualWeight ? ` a ${toText(first.actualWeight)} kg` : "";
  return `Registró ${logs.length} × ${first.actualReps}${kg}`;
}

function rowFromSessionExercise(key: string, se: SessionExerciseWithExercise, blockKeys: Set<string>): Row {
  const logs = se.logs ?? [];
  return {
    key,
    exerciseId: se.exerciseId,
    name: se.exercise.name,
    muscleGroup: se.exercise.muscleGroup,
    sets: String(se.targetSets),
    reps: String(se.targetReps),
    weight: se.targetWeight ? toText(se.targetWeight) : "",
    restSeconds: se.targetRestSeconds ? String(se.targetRestSeconds) : "",
    rir: se.targetRir === null || se.targetRir === undefined ? "" : String(se.targetRir),
    note: se.note ?? "",
    blockId: se.blockId && blockKeys.has(se.blockId) ? se.blockId : null,
    sessionExerciseId: se.id,
    loggedCount: logs.length,
    result: loggedResult(logs),
  };
}

export function structureFromSession(session: SessionDetail, makeKey: () => string): Structure {
  const blocks: DraftBlock[] = [...(session.blocks ?? [])]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((b) => ({ key: b.id, id: b.id, type: b.type, name: b.name, color: b.color, note: b.note ?? "" }));
  const keys = new Set(blocks.map((b) => b.key));
  const rows = [...session.sessionExercises].sort((a, b) => a.orderIndex - b.orderIndex).map((se) => rowFromSessionExercise(makeKey(), se, keys));
  return { blocks, rows };
}

// ¿Se abre bloqueada? Una sesión ya hecha, omitida o con series registradas: el diseño pide
// mostrar lo que registró el atleta y desbloquear con «Editar» solo si hace falta corregir.
export function isSessionLocked(session: Pick<SessionDetail, "status" | "sessionExercises">): boolean {
  return session.status !== "pending" || session.sessionExercises.some((se) => (se.logs?.length ?? 0) > 0);
}

export function hasLoggedRows(rows: Row[]): boolean {
  return rows.some((r) => (r.loggedCount ?? 0) > 0);
}

export const SESSION_MESSAGES = {
  name: "Ponle un nombre a la sesión.",
  removeLogged: "No se puede quitar: el atleta ya registró ejecución de este ejercicio.",
  removeBlockLogged: "No se puede quitar este bloque: tiene ejercicios que el atleta ya registró.",
} as const;

// A diferencia de una rutina, una sesión puede quedar sin ejercicios.
export function validateSessionStructure(name: string, s: Structure): string | null {
  if (!name.trim()) return SESSION_MESSAGES.name;
  if (s.blocks.length > MAX_BLOCKS) return STRUCTURE_MESSAGES.tooManyBlocks;
  for (const b of s.blocks) {
    if (!b.name.trim()) return STRUCTURE_MESSAGES.blockName;
    if (b.name.trim().length > BLOCK_NAME_MAX) return STRUCTURE_MESSAGES.blockNameLong;
  }
  if (s.rows.some((r) => !isRowComplete(r))) return STRUCTURE_MESSAGES.incomplete;
  return null;
}

function toSessionInput(row: Row): SessionExerciseStructureInput {
  const weight = parseNumber(row.weight);
  const rest = parseNumber(row.restSeconds);
  const note = row.note.trim();
  return {
    ...(row.sessionExerciseId ? { id: row.sessionExerciseId } : {}),
    exerciseId: row.exerciseId,
    targetSets: parseNumber(row.sets),
    targetReps: parseNumber(row.reps),
    ...(Number.isFinite(weight) && weight > 0 ? { targetWeight: weight } : {}),
    ...(Number.isFinite(rest) && rest >= 0 ? { targetRestSeconds: Math.round(rest) } : {}),
    ...(row.rir !== "" ? { targetRir: Number(row.rir) } : {}),
    ...(note ? { note } : {}),
  };
}

// Lo que se guarda con PUT /sessions/:id/structure: bloques en orden con sus ejercicios (con
// su id si ya existían) y los sueltos al final.
export function sessionPayload(s: Structure): SessionStructureInput {
  return {
    blocks: s.blocks.map((b) => {
      const note = b.note.trim();
      return {
        ...(b.id ? { id: b.id } : {}),
        type: b.type,
        name: b.name.trim(),
        ...(b.type === "custom" && b.color ? { color: b.color } : {}),
        ...(note ? { note } : {}),
        exercises: s.rows.filter((r) => r.blockId === b.key).map(toSessionInput),
      };
    }),
    exercises: s.rows.filter((r) => !r.blockId).map(toSessionInput),
  };
}

export interface SessionMeta {
  name: string;
  date: string;
  status: SessionStatus;
}

export function sessionMeta(session: Pick<SessionDetail, "name" | "scheduledDate" | "status">): SessionMeta {
  return { name: session.name, date: session.scheduledDate?.slice(0, 10) ?? "", status: session.status };
}

// Solo lo que cambió, para no volver a validar el día de una sesión que no se movió.
export function metaChanges(before: SessionMeta, after: SessionMeta): Partial<{ name: string; scheduledDate: string; status: SessionStatus }> {
  return {
    ...(after.name.trim() !== before.name ? { name: after.name.trim() } : {}),
    ...(after.date !== before.date && after.date ? { scheduledDate: after.date } : {}),
    ...(after.status !== before.status ? { status: after.status } : {}),
  };
}
