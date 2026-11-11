// Novedades: una ficha por funcionalidad nueva (docs/diseno/guia-novedades-bloques).
// La leen la web y, más adelante, la app. Lo que ya vio cada persona vive en su cuenta
// (`User.tourNewsSeen`, lista de claves `clave@version`); las fichas viven en el código.

export type NoveltyRole = "coach" | "athlete";
export type NoveltyPlatform = "web" | "mobile";

// Condiciones de lista cerrada, sin efectos secundarios: la web las resuelve con sus datos.
export type NoveltyCondition = "hasUngroupedRoutines" | "blocksPageEnabled";

// Ilustraciones animadas hechas en código (la web las dibuja). Una ficha futura puede usar
// `video` y `poster` en su lugar.
export type NoveltyDemoId =
  | "blocks-group"
  | "blocks-move"
  | "blocks-legacy"
  | "blocks-page"
  // App del atleta (la app las dibuja): la sesión por bloques.
  | "athlete-blocks-group"
  | "athlete-blocks-fold"
  | "athlete-blocks-progress";

export interface NoveltySlide {
  title: string;
  text: string;
  // Descripción de la demostración para lectores de pantalla.
  demoLabel: string;
  demo?: NoveltyDemoId;
  video?: string;
  poster?: string;
  when?: NoveltyCondition;
}

export interface Novelty {
  key: string;
  version: number;
  // Fecha de publicación (AAAA-MM-DD), para ordenar el historial.
  since: string;
  platforms: NoveltyPlatform[];
  roles: NoveltyRole[];
  // Nombre corto para el historial.
  name: string;
  slides: NoveltySlide[];
}

export const MAX_NOVELTY_SLIDES = 4;
export const MAX_NOVELTY_TEXT = 140;

export const NOVELTIES: Novelty[] = [
  {
    key: "routine-blocks",
    version: 1,
    since: "2026-11-10",
    platforms: ["web"],
    roles: ["coach"],
    name: "Rutinas por bloques",
    slides: [
      {
        title: "Te presentamos la nueva forma de agrupar tu entrenamiento",
        text: "Arma la rutina por bloques: calentamiento, pliometría, fuerza y más. Cada bloque tiene su color y su ícono.",
        demoLabel: "Una lista de ejercicios se ordena en tres bloques de colores.",
        demo: "blocks-group",
      },
      {
        title: "Mueve los ejercicios entre bloques",
        text: "Arrastra un ejercicio dentro de su bloque o a otro. ¿Prefieres no arrastrar? Usa ⋯ y Mover a otro bloque.",
        demoLabel: "Un ejercicio se arrastra de Fuerza a Pliometría y el menú ⋯ ofrece la misma acción.",
        demo: "blocks-move",
      },
      {
        title: "Tus rutinas anteriores siguen igual",
        text: "Cuando quieras, toca Agrupar en bloques y ordénalas. Solo sale si tienes rutinas sin bloque.",
        demoLabel: "Se pulsa «Agrupar en bloques» y una rutina suelta se ordena.",
        demo: "blocks-legacy",
        when: "hasUngroupedRoutines",
      },
      {
        title: "Una página nueva para editar por bloques",
        text: "Rutinas y sesiones se editan en la misma página, ordenadas por bloques. Toca Editar y pruébala.",
        demoLabel: "Se pulsa «Editar» y se abre la página con los bloques a la izquierda y el panel a la derecha.",
        demo: "blocks-page",
        when: "blocksPageEnabled",
      },
    ],
  },
  {
    key: "athlete-blocks",
    version: 1,
    since: "2026-11-11",
    platforms: ["mobile"],
    roles: ["athlete"],
    name: "Tu sesión por bloques",
    slides: [
      {
        title: "Tu sesión ahora viene por bloques",
        text: "Tu coach ordena el entrenamiento en bloques: calentamiento, pliometría, fuerza y más. Cada uno tiene su color y su ícono.",
        demoLabel: "Una lista de ejercicios se ordena en tres bloques de colores.",
        demo: "athlete-blocks-group",
      },
      {
        title: "Abre y pliega cada bloque",
        text: "Toca un bloque para ver sus ejercicios o esconderlos. El que te toca ahora se abre solo.",
        demoLabel: "Se toca el encabezado de un bloque y sus ejercicios se muestran y se esconden.",
        demo: "athlete-blocks-fold",
      },
      {
        title: "Mira tu avance en cada bloque",
        text: "Cada bloque te dice cuántos ejercicios llevas, como «1 de 2», y pasa a «Hecho» cuando lo terminas.",
        demoLabel: "El avance de un bloque pasa de «0 de 2» a «1 de 2» y luego a «Hecho».",
        demo: "athlete-blocks-progress",
      },
    ],
  },
];

export const noveltyKey = (n: Pick<Novelty, "key" | "version">) => `${n.key}@${n.version}`;

// Claves vigentes: las que una cuenta nueva recibe ya vistas.
export const CURRENT_NOVELTY_KEYS = NOVELTIES.map(noveltyKey);

export interface NoveltyViewer {
  role: NoveltyRole | "admin" | null | undefined;
  platform: NoveltyPlatform;
}

export function noveltyAppliesTo(n: Novelty, viewer: NoveltyViewer): boolean {
  return !!viewer.role && viewer.role !== "admin" && n.roles.includes(viewer.role) && n.platforms.includes(viewer.platform);
}

// Las novedades de su rol y plataforma, de la más reciente a la más antigua.
export function noveltiesFor(viewer: NoveltyViewer, list: Novelty[] = NOVELTIES): Novelty[] {
  return list
    .filter((n) => noveltyAppliesTo(n, viewer))
    .sort((a, b) => (a.since === b.since ? b.version - a.version : a.since < b.since ? 1 : -1));
}

// La novedad que hay que mostrar ahora: solo la más reciente sin ver (sin popups encadenados).
export function pendingNovelty(seen: string[] | undefined, viewer: NoveltyViewer, list: Novelty[] = NOVELTIES): Novelty | null {
  const done = new Set(seen ?? []);
  return noveltiesFor(viewer, list).find((n) => !done.has(noveltyKey(n))) ?? null;
}

// Las slides que corresponden hoy: las que traen condición se omiten si no se cumple.
export function visibleSlides(n: Novelty, conditions: Partial<Record<NoveltyCondition, boolean>>): NoveltySlide[] {
  return n.slides.filter((s) => !s.when || conditions[s.when] === true);
}
