import type { NoveltyCondition } from "@cycles/shared";

// Cuándo puede salir el popup de novedades (docs/diseno/guia-novedades-bloques): nunca encima
// de un diálogo, de la guía de primer uso ni de una página donde se edita algo sin guardar.
export const NOVELTY_DELAY_MS = 1500;

// Páginas del constructor de rutinas y de sesiones: hay un borrador abierto.
export function isBuilderPath(pathname: string): boolean {
  return /^\/(routines|sessions)\/[^/]+/.test(pathname);
}

export function canShowNovelty(state: { pathname: string; tourActive: boolean; modalOpen: boolean }): boolean {
  return !state.tourActive && !state.modalOpen && !isBuilderPath(state.pathname);
}

export function anyModalOpen(doc: Document = document): boolean {
  return doc.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

// Las condiciones de las slides se resuelven con los datos de la persona.
export function noveltyConditions(routines: { routineExercises: { blockId?: string | null }[] }[] | undefined): Partial<Record<NoveltyCondition, boolean>> {
  return {
    hasUngroupedRoutines: (routines ?? []).some((r) => r.routineExercises.some((e) => !e.blockId)),
    // La página de edición por bloques ya está confirmada y publicada (CYC-275).
    blocksPageEnabled: true,
  };
}

export function formatNoveltyDate(since: string): string {
  const [y, m, d] = since.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}
