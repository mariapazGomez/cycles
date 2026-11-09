import type { SessionWorkBlock, WorkBlockType } from "@cycles/shared";

// Presentación de los bloques de trabajo (CYC-268, docs/diseno/sesion-por-bloques).
// Cada tipo tiene su nombre y su color; ninguno es azul (el azul es de la app).
export const BLOCK_TYPE_LABEL: Record<WorkBlockType, string> = {
  warmup: "Calentamiento",
  plyometrics: "Pliometría",
  strength: "Fuerza",
  mobility: "Movilidad",
  cooldown: "Vuelta a la calma",
  cardio: "Cardio",
  custom: "Personalizado",
  superset: "Superserie",
};

export const BLOCK_TYPE_COLOR: Record<WorkBlockType, string> = {
  warmup: "#e8a317",
  plyometrics: "#d9588f",
  strength: "#2f9e5f",
  mobility: "#8a63d2",
  cooldown: "#1fa39a",
  cardio: "#e0752b",
  custom: "#5c6068",
  superset: "#4a5568",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// El personalizado lleva el color que eligió el coach; los demás, el de su tipo.
export function blockColor(block: Pick<SessionWorkBlock, "type" | "color">): string {
  return block.type === "custom" && block.color && HEX.test(block.color) ? block.color : BLOCK_TYPE_COLOR[block.type];
}

interface ExerciseLike {
  id: string;
  blockId?: string | null;
  orderIndex: number;
  targetSets: number;
}

export interface BlockGroup<E extends ExerciseLike> {
  block: SessionWorkBlock | null;
  exercises: E[];
}

// Los ejercicios agrupados por bloque, en el orden de los bloques. Los que no tienen
// bloque (sesiones anteriores o un bloque que ya no existe) van al final, juntos y
// sin encabezado: se ven como la lista de siempre.
export function groupByBlock<E extends ExerciseLike>(blocks: SessionWorkBlock[] | undefined, exercises: E[]): BlockGroup<E>[] {
  const ordered = [...(blocks ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const byOrder = (a: E, b: E) => a.orderIndex - b.orderIndex;
  const known = new Set(ordered.map((b) => b.id));
  const groups: BlockGroup<E>[] = ordered.map((block) => ({
    block,
    exercises: exercises.filter((e) => e.blockId === block.id).sort(byOrder),
  }));
  const loose = exercises.filter((e) => !e.blockId || !known.has(e.blockId)).sort(byOrder);
  if (loose.length > 0) groups.push({ block: null, exercises: loose });
  return groups;
}

export function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function blockSummary(exercises: ExerciseLike[]): string {
  const sets = exercises.reduce((sum, e) => sum + e.targetSets, 0);
  return `${countLabel(exercises.length, "ejercicio", "ejercicios")}, ${countLabel(sets, "serie", "series")}`;
}

// «3 bloques, 8 ejercicios, 22 series» (sin la parte de bloques si no hay).
export function sessionSummary(groups: BlockGroup<ExerciseLike>[]): string {
  const blocks = groups.filter((g) => g.block).length;
  const all = groups.flatMap((g) => g.exercises);
  const sets = all.reduce((sum, e) => sum + e.targetSets, 0);
  return [
    ...(blocks > 0 ? [countLabel(blocks, "bloque", "bloques")] : []),
    countLabel(all.length, "ejercicio", "ejercicios"),
    countLabel(sets, "serie", "series"),
  ].join(", ");
}
