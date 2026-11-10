import type { RoutineStructureInput, WorkBlockType } from "@cycles/shared";
import { CUSTOM_BLOCK_COLORS } from "@cycles/shared";
import type { RoutineDetail } from "../services/routinesApi";
import { BLOCK_TYPE_COLOR, BLOCK_TYPE_LABEL } from "./workBlocks";
import { DRAFT_MESSAGES, canMoveRow, moveRowIn, rowsFromRoutine, type Row } from "./routineDraft";
import { isRowComplete, parseNumber, computeRoutineStats, type RoutineStats } from "./routineStats";
import { toInput, toStatsRow } from "./routineRows";

// Lógica pura del constructor por bloques (CYC-275): el borrador completo de una rutina
// con sus bloques y ejercicios. Sin DOM, para probarla con jest. Cada fila apunta a su
// bloque por la clave del bloque (`row.blockId`); null = ejercicio suelto (sin bloque).

export interface DraftBlock {
  // Clave dentro del borrador: el id del servidor si el bloque ya existía, o una nueva.
  key: string;
  // Solo si el bloque ya existe en el servidor (se envía para conservarlo).
  id?: string;
  type: WorkBlockType;
  name: string;
  // Solo en «Personalizado»; null en los demás.
  color: string | null;
  note: string;
}

export interface Structure {
  blocks: DraftBlock[];
  rows: Row[];
}

export const MAX_BLOCKS = 12;
export const BLOCK_NAME_MAX = 40;
// Los tipos que el coach puede elegir (la superserie está reservada, CYC-108).
export const CHOOSABLE_TYPES: WorkBlockType[] = ["warmup", "plyometrics", "strength", "mobility", "cooldown", "cardio", "custom"];

export const STRUCTURE_MESSAGES = {
  ...DRAFT_MESSAGES,
  blockName: "Ponle un nombre a cada bloque.",
  blockNameLong: `El nombre del bloque puede tener hasta ${BLOCK_NAME_MAX} caracteres.`,
  tooManyBlocks: `Una rutina puede tener hasta ${MAX_BLOCKS} bloques.`,
} as const;

export function blockColorOf(block: Pick<DraftBlock, "type" | "color">): string {
  return block.type === "custom" && block.color ? block.color : BLOCK_TYPE_COLOR[block.type];
}

export function structureFromRoutine(routine: RoutineDetail | null | undefined, makeKey: () => string): Structure {
  const blocks: DraftBlock[] = [...(routine?.blocks ?? [])]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((b) => ({ key: b.id, id: b.id, type: b.type, name: b.name, color: b.color, note: b.note ?? "" }));
  const known = new Set(blocks.map((b) => b.key));
  const rows = rowsFromRoutine(routine, makeKey).map((row) => (row.blockId && !known.has(row.blockId) ? { ...row, blockId: null } : row));
  return { blocks, rows };
}

export function addBlock(s: Structure, type: WorkBlockType, key: string): Structure {
  if (s.blocks.length >= MAX_BLOCKS) return s;
  const block: DraftBlock = {
    key,
    type,
    name: type === "custom" ? "Nuevo bloque" : BLOCK_TYPE_LABEL[type],
    color: type === "custom" ? CUSTOM_BLOCK_COLORS[4] : null,
    note: "",
  };
  return { ...s, blocks: [...s.blocks, block] };
}

export function updateBlock(s: Structure, key: string, patch: Partial<Omit<DraftBlock, "key" | "id">>): Structure {
  return {
    ...s,
    blocks: s.blocks.map((b) => {
      if (b.key !== key) return b;
      const next = { ...b, ...patch };
      // Cambiar de tipo: el color solo vale en «Personalizado»; el nombre sigue siendo del coach.
      if (patch.type && patch.type !== "custom") next.color = null;
      if (patch.type === "custom" && !next.color) next.color = CUSTOM_BLOCK_COLORS[4];
      return next;
    }),
  };
}

// Quita el bloque con sus ejercicios (el constructor ofrece «Deshacer»).
export function removeBlock(s: Structure, key: string): Structure {
  return { blocks: s.blocks.filter((b) => b.key !== key), rows: s.rows.filter((r) => r.blockId !== key) };
}

export function moveBlock(s: Structure, key: string, direction: -1 | 1): Structure {
  const index = s.blocks.findIndex((b) => b.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= s.blocks.length) return s;
  const blocks = [...s.blocks];
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
  return { ...s, blocks };
}

// Pasa un ejercicio al final de otro bloque (o a los sueltos con null).
export function moveRowToBlock(s: Structure, rowKey: string, blockKey: string | null): Structure {
  const row = s.rows.find((r) => r.key === rowKey);
  if (!row || row.blockId === blockKey) return s;
  if (blockKey !== null && !s.blocks.some((b) => b.key === blockKey)) return s;
  return { ...s, rows: [...s.rows.filter((r) => r.key !== rowKey), { ...row, blockId: blockKey }] };
}

// Suelta un ejercicio en la posición `index` de un bloque (o de los sueltos con null). `index`
// cuenta los ejercicios de ese bloque sin el que se mueve, como lo informa el arrastre.
export function placeRow(s: Structure, rowKey: string, blockKey: string | null, index: number): Structure {
  const row = s.rows.find((r) => r.key === rowKey);
  if (!row) return s;
  if (blockKey !== null && !s.blocks.some((b) => b.key === blockKey)) return s;
  const others = s.rows.filter((r) => r.key !== rowKey);
  const target = others.filter((r) => (r.blockId ?? null) === blockKey);
  const moved = { ...row, blockId: blockKey };
  let at: number;
  if (index < target.length) at = others.indexOf(target[Math.max(0, index)]);
  else if (target.length > 0) at = others.indexOf(target[target.length - 1]) + 1;
  else at = others.length;
  const rows = [...others.slice(0, at), moved, ...others.slice(at)];
  const unchanged = rows.every((r, i) => r === s.rows[i] || (r.key === s.rows[i]?.key && r.blockId === s.rows[i]?.blockId));
  return unchanged ? s : { ...s, rows };
}

// Lleva el bloque de la posición `from` a la posición `to`.
export function reorderBlocks(s: Structure, from: number, to: number): Structure {
  if (from === to || from < 0 || to < 0 || from >= s.blocks.length || to >= s.blocks.length) return s;
  const blocks = [...s.blocks];
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return { ...s, blocks };
}

// Sube o baja un ejercicio dentro de su bloque.
export function moveRowInBlock(s: Structure, rowKey: string, direction: -1 | 1): Structure {
  const index = s.rows.findIndex((r) => r.key === rowKey);
  return { ...s, rows: moveRowIn(s.rows, index, direction) };
}

export function canMoveInBlock(s: Structure, rowKey: string, direction: -1 | 1): boolean {
  return canMoveRow(s.rows, s.rows.findIndex((r) => r.key === rowKey), direction);
}

export function looseRows(s: Structure): Row[] {
  return s.rows.filter((r) => !r.blockId);
}

// «Agrupar en bloques»: los ejercicios sueltos pasan a un bloque «Fuerza» nuevo.
export function groupLoose(s: Structure, key: string): Structure {
  if (looseRows(s).length === 0 || s.blocks.length >= MAX_BLOCKS) return s;
  const block: DraftBlock = { key, type: "strength", name: BLOCK_TYPE_LABEL.strength, color: null, note: "" };
  return { blocks: [...s.blocks, block], rows: s.rows.map((r) => (r.blockId ? r : { ...r, blockId: key })) };
}

export interface BlockView {
  block: DraftBlock | null;
  rows: Row[];
}

// Lo que se dibuja: cada bloque con sus ejercicios, y los sueltos al final.
export function structureView(s: Structure): BlockView[] {
  const views: BlockView[] = s.blocks.map((block) => ({ block, rows: s.rows.filter((r) => r.blockId === block.key) }));
  const loose = looseRows(s);
  if (loose.length > 0) views.push({ block: null, rows: loose });
  return views;
}

export function rowsSets(rows: Row[]): number {
  return rows.reduce((sum, r) => {
    const n = parseNumber(r.sets);
    return sum + (Number.isInteger(n) && n > 0 ? n : 0);
  }, 0);
}

// «2 ejercicios · 4 series»
export function blockSummaryText(rows: Row[]): string {
  const sets = rowsSets(rows);
  return `${rows.length} ${rows.length === 1 ? "ejercicio" : "ejercicios"} · ${sets} ${sets === 1 ? "serie" : "series"}`;
}

export function structureStats(s: Structure): RoutineStats {
  return computeRoutineStats(s.rows.map(toStatsRow));
}

// El primer problema que impide guardar, o null si está lista.
export function validateStructure(name: string, s: Structure): string | null {
  if (!name.trim()) return STRUCTURE_MESSAGES.name;
  if (s.blocks.length > MAX_BLOCKS) return STRUCTURE_MESSAGES.tooManyBlocks;
  for (const b of s.blocks) {
    if (!b.name.trim()) return STRUCTURE_MESSAGES.blockName;
    if (b.name.trim().length > BLOCK_NAME_MAX) return STRUCTURE_MESSAGES.blockNameLong;
  }
  if (s.rows.length === 0) return STRUCTURE_MESSAGES.empty;
  if (s.rows.some((r) => !isRowComplete(r))) return STRUCTURE_MESSAGES.incomplete;
  return null;
}

// Lo que se guarda: los bloques en orden con sus ejercicios, y los sueltos al final. Sin
// bloques manda solo `exercises`, como siempre.
export function structurePayload(name: string, s: Structure): RoutineStructureInput & { name: string } {
  const loose = s.rows.filter((r) => !r.blockId).map(toInput);
  if (s.blocks.length === 0) return { name: name.trim(), exercises: loose };
  return {
    name: name.trim(),
    blocks: s.blocks.map((b) => {
      const note = b.note.trim();
      return {
        ...(b.id ? { id: b.id } : {}),
        type: b.type,
        name: b.name.trim(),
        ...(b.type === "custom" && b.color ? { color: b.color } : {}),
        ...(note ? { note } : {}),
        exercises: s.rows.filter((r) => r.blockId === b.key).map(toInput),
      };
    }),
    exercises: loose,
  };
}

// ¿Cambió algo respecto de lo guardado? Para avisar antes de salir.
export function structureSignature(name: string, s: Structure): string {
  return JSON.stringify([name.trim(), s.blocks.map(({ key: _k, ...rest }) => rest), s.rows.map(({ key: _k, ...rest }) => rest)]);
}
