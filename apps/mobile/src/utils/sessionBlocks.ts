import { groupByBlock, type SessionWorkBlock } from '@cycles/shared';

// Sesión del atleta agrupada por bloques de trabajo (CYC-272, docs/diseno/sesion-por-bloques).
// Sin bloques (o con todos los ejercicios sueltos) no hay agrupación: la sesión se ve como siempre.
interface ExerciseLike {
  id: string;
  blockId?: string | null;
  orderIndex: number;
  targetSets: number;
  logs: Array<unknown>;
}

export type SectionState = 'done' | 'current' | 'pending';

export interface BlockSectionData<E extends ExerciseLike> {
  /** Estable entre recargas: el id del bloque, o «sueltos». */
  key: string;
  /** null = ejercicios sin bloque (se dibujan sin encabezado, como la lista de siempre). */
  block: SessionWorkBlock | null;
  /** Cada ejercicio con su posición global en la sesión (el número que ve la persona). */
  items: Array<{ exercise: E; index: number }>;
  doneCount: number;
  total: number;
  loggedSets: number;
  plannedSets: number;
  state: SectionState;
  /** Abierto al llegar: el bloque en curso (o el primero pendiente); los hechos y los demás, plegados. */
  defaultOpen: boolean;
}

const complete = (e: ExerciseLike) => e.logs.length >= e.targetSets;

// null = sin bloques: se muestra la lista plana de hoy.
export function sessionSections<E extends ExerciseLike>(
  blocks: SessionWorkBlock[] | undefined,
  exercises: E[],
): BlockSectionData<E>[] | null {
  if (!blocks || blocks.length === 0 || exercises.length === 0) {
    return null;
  }
  // Un bloque sin ejercicios no tiene nada que hacer: no se muestra.
  const groups = groupByBlock(blocks, exercises).filter(g => g.exercises.length > 0);
  // Si ningún ejercicio pertenece a un bloque, no hay nada que agrupar.
  if (groups.every(g => g.block === null)) {
    return null;
  }
  // La posición global sigue el orden de los bloques (el orden en que se entrena), no el de la API.
  let next = 0;
  const sections = groups.map(group => {
    const items = group.exercises.map(exercise => ({ exercise, index: next++ }));
    const doneCount = group.exercises.filter(complete).length;
    return {
      key: group.block?.id ?? 'sueltos',
      block: group.block,
      items,
      doneCount,
      total: group.exercises.length,
      loggedSets: group.exercises.reduce((sum, e) => sum + Math.min(e.logs.length, e.targetSets), 0),
      plannedSets: group.exercises.reduce((sum, e) => sum + e.targetSets, 0),
    };
  });
  // El primer bloque con algo pendiente es el que sigue (y se abre solo).
  const currentIndex = sections.findIndex(s => s.block !== null && s.doneCount < s.total);
  return sections.map((s, i) => {
    const done = s.total > 0 && s.doneCount === s.total;
    return {
      ...s,
      state: done ? 'done' : i === currentIndex ? 'current' : 'pending',
      // Los ejercicios sueltos van siempre abiertos, como la lista de siempre.
      defaultOpen: s.block === null || i === currentIndex,
    } as BlockSectionData<E>;
  });
}

// «1 de 2» o «Hecho»: el progreso de un bloque en palabras.
export function sectionProgress(section: Pick<BlockSectionData<ExerciseLike>, 'doneCount' | 'total'>): string {
  return section.total > 0 && section.doneCount === section.total ? 'Hecho' : `${section.doneCount} de ${section.total}`;
}
