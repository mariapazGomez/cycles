// Panel de la sesión del equipo (docs/diseno/equipos-ancho-completo, parte 3). Lógica pura.
import type { Exercise, SessionStructureInput } from "@cycles/shared";
import type { TeamCycleDetail, TeamSession, TeamSessionCopy } from "../services/teamCyclesApi";
import { dayName } from "./cycleRange";
import { DEFAULT_SETS, isValidPercent, loadPayload, rowLoadMode } from "./routineRows";
import { parseNumber } from "./routineStats";
import { rowsOf, type EditRow } from "./teamSessionRows";
import { dayOfMonth, weekdayName } from "./weekCalendar";

const day = (iso: string) => iso.slice(0, 10);
type StructureExercise = NonNullable<SessionStructureInput["exercises"]>[number];

export const NOTE_MAX = 500;

// Las filas del panel, en el orden en que se guardan (bloques y después los sueltos). A diferencia
// del cuadro de Ciclos, aquí el descanso y la nota se editan.
export function panelRows(session: TeamSession): EditRow[] {
  const byId = new Map(session.exercises.map((e) => [e.id, e]));
  const rows = rowsOf(session).map((row) => {
    const e = byId.get(row.key)!;
    return {
      ...row,
      restSeconds: e.targetRestSeconds == null ? "" : String(e.targetRestSeconds),
      rir: e.targetRir == null ? "" : String(e.targetRir),
      note: e.note ?? "",
    };
  });
  return panelGroups(session, rows).flatMap((g) => g.rows);
}

export interface PanelGroup {
  blockId: string | null;
  name: string | null;
  rows: EditRow[];
}

export function panelGroups(session: Pick<TeamSession, "blocks">, rows: EditRow[]): PanelGroup[] {
  const blocks = [...session.blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  const known = new Set(blocks.map((b) => b.id));
  return [
    ...blocks.map((b) => ({ blockId: b.id, name: b.name, rows: rows.filter((r) => r.blockId === b.id) })),
    { blockId: null, name: null, rows: rows.filter((r) => !r.blockId || !known.has(r.blockId)) },
  ].filter((g) => g.rows.length > 0);
}

// Sube o baja un ejercicio dentro de su grupo.
export function moveRow(rows: EditRow[], key: string, delta: -1 | 1): EditRow[] {
  const from = rows.findIndex((r) => r.key === key);
  if (from < 0) return rows;
  const same = rows.map((r, i) => ({ r, i })).filter((x) => (x.r.blockId ?? null) === (rows[from].blockId ?? null));
  const target = same[same.findIndex((x) => x.i === from) + delta];
  if (!target) return rows;
  const next = [...rows];
  [next[from], next[target.i]] = [next[target.i], next[from]];
  return next;
}

export const NEW_PREFIX = "nuevo-";

export function newRow(key: string, exercise: Exercise): EditRow {
  return { key: `${NEW_PREFIX}${key}`, exerciseId: exercise.id, name: exercise.name, muscleGroup: exercise.muscleGroup, sets: DEFAULT_SETS, reps: "", weight: "", restSeconds: "", rir: "", note: "", blockId: null };
}

const isCount = (text: string) => {
  const n = parseNumber(text);
  return Number.isInteger(n) && n >= 1;
};
const isRest = (text: string) => {
  if (text.trim() === "") return true;
  const n = parseNumber(text);
  return Number.isInteger(n) && n >= 0;
};

export interface Built {
  input: SessionStructureInput | null;
  badSets: Set<string>;
  badReps: Set<string>;
  badLoad: Set<string>;
  badRest: Set<string>;
}

function toExercise(row: EditRow): StructureExercise {
  const load = loadPayload(row);
  const note = row.note.trim();
  return {
    ...(row.key.startsWith(NEW_PREFIX) ? {} : { id: row.key }),
    exerciseId: row.exerciseId,
    targetSets: parseNumber(row.sets),
    targetReps: parseNumber(row.reps),
    targetWeight: load.weight,
    targetPercentRm: load.percent,
    targetRestSeconds: row.restSeconds.trim() === "" ? undefined : parseNumber(row.restSeconds),
    targetRir: row.rir === "" ? undefined : Number(row.rir),
    note: note === "" ? undefined : note,
  };
}

// La estructura sin validar: sirve para saber si hay cambios. Un bloque que queda sin ejercicios
// se quita.
export function draftStructure(session: Pick<TeamSession, "blocks">, rows: EditRow[]): SessionStructureInput {
  const groups = panelGroups(session, rows);
  const blocks = new Map(session.blocks.map((b) => [b.id, b]));
  return {
    blocks: groups
      .filter((g) => g.blockId)
      .map((g) => {
        const b = blocks.get(g.blockId!)!;
        return { id: b.id, type: b.type, name: b.name, color: b.color ?? undefined, note: b.note ?? undefined, exercises: g.rows.map(toExercise) };
      }),
    exercises: groups.filter((g) => !g.blockId).flatMap((g) => g.rows.map(toExercise)),
  };
}

export function buildStructure(session: Pick<TeamSession, "blocks">, rows: EditRow[]): Built {
  const keys = (bad: (r: EditRow) => boolean) => new Set(rows.filter(bad).map((r) => r.key));
  const badSets = keys((r) => !isCount(r.sets));
  const badReps = keys((r) => !isCount(r.reps));
  const badRest = keys((r) => !isRest(r.restSeconds));
  const badLoad = keys((r) => {
    if (rowLoadMode(r) === "percent") return (r.percentRm ?? "").trim() !== "" && !isValidPercent(r.percentRm);
    return r.weight.trim() !== "" && !(parseNumber(r.weight) >= 0);
  });
  const ok = rows.length > 0 && badSets.size + badReps.size + badRest.size + badLoad.size === 0;
  return { input: ok ? draftStructure(session, rows) : null, badSets, badReps, badLoad, badRest };
}

// Lo que se compara para saber si hay cambios sin guardar. Incluye lo escrito a medias, que al
// convertirlo se perdería (por ejemplo, «abc» en las series).
export function draftSignature(rows: EditRow[]): string {
  return JSON.stringify(rows.map((r) => [r.key, r.blockId, r.sets, r.reps, rowLoadMode(r), rowLoadMode(r) === "percent" ? (r.percentRm ?? "") : r.weight, r.restSeconds, r.rir, r.note]));
}

// «Deshacer» un guardado: la versión anterior. Lo que ese guardado quitó ya no existe en la API, así
// que vuelve sin id (se crea de nuevo); lo demás conserva el suyo.
export function undoStructure(previous: SessionStructureInput, saved: SessionStructureInput): SessionStructureInput {
  const exercisesOf = (s: SessionStructureInput) => [...(s.blocks ?? []).flatMap((b) => b.exercises), ...(s.exercises ?? [])];
  const keptExercises = new Set(exercisesOf(saved).map((e) => e.id));
  const keptBlocks = new Set((saved.blocks ?? []).map((b) => b.id));
  const exercise = (e: StructureExercise): StructureExercise => (e.id && !keptExercises.has(e.id) ? { ...e, id: undefined } : e);
  return {
    blocks: previous.blocks?.map((b) => ({ ...b, id: b.id && keptBlocks.has(b.id) ? b.id : undefined, exercises: b.exercises.map(exercise) })),
    exercises: previous.exercises?.map(exercise),
  };
}

// --- a quién llega ---

export interface Excluded {
  athleteId: string;
  name: string;
  reason: string;
}

export interface Reach {
  reach: number;
  excluded: Excluded[];
}

const copyDay = (copy: TeamSessionCopy, session: TeamSession) => day(copy.scheduledDate ?? session.scheduledDate);
const longDay = (iso: string) => `${weekdayName(iso)} ${dayOfMonth(iso)}`;

// «movida al sábado 28», si el día de esa persona no es el del plan.
export function movedTo(copy: TeamSessionCopy, session: TeamSession): string | null {
  const own = copyDay(copy, session);
  return own === day(session.scheduledDate) ? null : `movida al ${longDay(own)}`;
}

function reasonOf(copy: TeamSessionCopy, session: TeamSession): string {
  if (copy.skip === "recorded") {
    if (copy.status === "completed") return "ya la hizo";
    return copy.status === "skipped" ? "la omitió" : "ya la empezó o tiene registro";
  }
  const moved = movedTo(copy, session);
  if (copy.skip === "adjusted") return moved ? `tiene la sesión ajustada, ${moved}` : "tiene la sesión ajustada";
  return `la tiene el ${longDay(copyDay(copy, session))}, un día pasado`;
}

// Quiénes reciben un cambio hecho hoy y quiénes no, con el motivo que da la API (`skip`). Quien
// recibe el ciclo y no tiene copia de esta sesión tampoco lo recibe.
export function reachOf(cycle: Pick<TeamCycleDetail, "athletes">, session: TeamSession): Reach {
  const names = new Map(cycle.athletes.map((a) => [a.athleteId, a.name]));
  const nameOf = (id: string) => names.get(id) ?? "Un atleta";
  const excluded = session.copies.filter((c) => c.skip !== null).map((c) => ({ athleteId: c.athleteId, name: nameOf(c.athleteId), reason: reasonOf(c, session) }));
  const withCopy = new Set(session.copies.map((c) => c.athleteId));
  for (const a of cycle.athletes) {
    if (a.status === "active" && !withCopy.has(a.athleteId)) excluded.push({ athleteId: a.athleteId, name: a.name, reason: "no tiene esta sesión" });
  }
  return { reach: session.copies.filter((c) => c.skip === null).length, excluded: excluded.sort((a, b) => a.name.localeCompare(b.name, "es")) };
}

// Por qué el panel es de solo lectura; null si se puede editar.
export function readOnlyReason(cycle: Pick<TeamCycleDetail, "status" | "endDate">, session: TeamSession, today: string, reach: number): string | null {
  if (cycle.status === "archived") return "El ciclo está archivado.";
  if (cycle.status !== "active" || today > day(cycle.endDate)) return "El ciclo terminó.";
  if (day(session.scheduledDate) < today) return "Es de un día pasado: se conserva como quedó.";
  return reach === 0 ? "Nadie recibiría un cambio. Puedes duplicarla en otro día." : null;
}

export interface Person {
  athleteId: string;
  name: string;
  sessionId: string;
  state: string;
  done: boolean;
}

// En solo lectura: cómo quedó la sesión de cada persona, sin dar a entender que fue el día del plan.
export function peopleOf(cycle: Pick<TeamCycleDetail, "athletes">, session: TeamSession): Person[] {
  const names = new Map(cycle.athletes.map((a) => [a.athleteId, a.name]));
  return session.copies
    .map((c) => {
      const status = c.status === "completed" ? "Hecha" : c.status === "skipped" ? "Omitida" : "Sin hacer";
      const extra = [c.adjusted ? "ajustada" : null, movedTo(c, session)].filter(Boolean).join(", ");
      return { athleteId: c.athleteId, name: names.get(c.athleteId) ?? "Un atleta", sessionId: c.sessionId, state: extra ? `${status}, ${extra}` : status, done: c.status === "completed" };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export const panelTitle = (session: TeamSession, today: string) => dayName(day(session.scheduledDate), today);
