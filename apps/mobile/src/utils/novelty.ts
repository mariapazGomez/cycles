import type { NoveltyViewer } from '@cycles/shared';

// Cuándo puede salir el popup de novedades (docs/diseno/guia-novedades-bloques): 1,5 s después
// de cargar, solo en una pestaña (nunca sobre un ejercicio, un formulario o un modal) y nunca
// mientras la guía de primer uso esté pendiente o la cortina de bienvenida en pantalla.
export const NOVELTY_DELAY_MS = 1500;
export const NOVELTY_VIEWER: NoveltyViewer = { role: 'athlete', platform: 'mobile' };
const TAB_ROUTES = ['Calendar', 'Today', 'Summary', 'Assistant'];

export function canShowNovelty(state: { route: string | undefined; tourPending: boolean; welcome: boolean }): boolean {
  return state.route !== undefined && TAB_ROUTES.includes(state.route) && !state.tourPending && !state.welcome;
}
