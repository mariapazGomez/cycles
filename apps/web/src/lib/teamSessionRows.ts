// Las filas de «Editar ejercicios» de una sesión del equipo (texto, como en el constructor) y su
// vuelta a lo que pide la API. Solo cambian series, repeticiones y carga; lo demás se conserva.
import type { SessionStructureInput } from "@cycles/shared";
import type { TeamSession } from "../services/teamCyclesApi";
import { isValidPercent, loadPayload, rowLoadMode, toText, type Row } from "./routineRows";
import { parseNumber } from "./routineStats";

export type EditRow = Row;

export function rowsOf(session: TeamSession): EditRow[] {
  return [...session.exercises]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((e) => ({
      key: e.id,
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      muscleGroup: e.exercise.muscleGroup,
      sets: String(e.targetSets),
      reps: String(e.targetReps),
      weight: e.targetWeight ? toText(e.targetWeight) : "",
      ...(e.targetPercentRm != null ? { loadMode: "percent" as const, percentRm: String(e.targetPercentRm) } : {}),
      restSeconds: "",
      rir: "",
      note: "",
      blockId: e.blockId,
    }));
}

const isCount = (text: string) => {
  const n = parseNumber(text);
  return Number.isInteger(n) && n >= 1;
};

export function fromRows(
  base: SessionStructureInput,
  rows: EditRow[],
): { input: SessionStructureInput | null; badSets: Set<string>; badReps: Set<string>; badLoad: Set<string> } {
  const badSets = new Set(rows.filter((r) => !isCount(r.sets)).map((r) => r.key));
  const badReps = new Set(rows.filter((r) => !isCount(r.reps)).map((r) => r.key));
  // Una carga escrita que no sirve se marca; vacía significa sin carga.
  const badLoad = new Set(
    rows
      .filter((r) => {
        if (rowLoadMode(r) === "percent") return (r.percentRm ?? "").trim() !== "" && !isValidPercent(r.percentRm);
        return r.weight.trim() !== "" && !(parseNumber(r.weight) >= 0);
      })
      .map((r) => r.key),
  );
  if (badSets.size + badReps.size + badLoad.size > 0) return { input: null, badSets, badReps, badLoad };
  const byId = new Map(rows.map((r) => [r.key, r]));
  const apply = (e: NonNullable<SessionStructureInput["exercises"]>[number]) => {
    const row = byId.get(e.id!);
    if (!row) return e;
    const load = loadPayload(row);
    return { ...e, targetSets: parseNumber(row.sets), targetReps: parseNumber(row.reps), targetWeight: load.weight, targetPercentRm: load.percent };
  };
  return {
    input: { blocks: base.blocks?.map((b) => ({ ...b, exercises: b.exercises.map(apply) })), exercises: base.exercises?.map(apply) },
    badSets,
    badReps,
    badLoad,
  };
}
