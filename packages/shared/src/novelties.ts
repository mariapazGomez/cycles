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
  | "athlete-blocks-progress"
  // App del atleta: la tarjeta «Esta semana» de Hoy.
  | "athlete-weekly-ring"
  | "athlete-weekly-figures"
  // App del atleta: compartir la sesión como imagen.
  | "athlete-share-button"
  | "athlete-share-formats"
  | "athlete-share-data"
  // RM y carga como % del RM (CYC-312): la web del coach y el atleta.
  | "rm-percent-row"
  | "rm-athlete-sheet"
  | "rm-multi-add"
  | "athlete-rm-percent"
  // Equipos del coach (CYC-310): solo la web del coach.
  | "teams-group"
  | "teams-create"
  // Nuevo ciclo por calendario (CYC-314): web del coach.
  | "cycle-range"
  | "cycle-fields"
  | "cycle-guard"
  | "cycle-template"
  // Dos ciclos a la vez (CYC-316): la tarjeta del atleta en la web del coach y «Hoy» en la web del atleta.
  | "two-cycles-card"
  | "two-cycles-alert"
  | "two-cycles-today"
  | "two-cycles-start"
  // Ciclo del equipo (CYC-314): web del coach.
  | "team-cycle";

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
  {
    key: "athlete-weekly",
    version: 1,
    since: "2026-11-11",
    platforms: ["mobile"],
    roles: ["athlete"],
    name: "Tu semana en Hoy",
    slides: [
      {
        title: "Tu semana de un vistazo",
        text: "Arriba de Hoy ves cuántas sesiones llevas esta semana. El anillo se llena a medida que entrenas.",
        demoLabel: "Una tarjeta «Esta semana» donde un anillo pasa de 0 a 2 sesiones de 3.",
        demo: "athlete-weekly-ring",
      },
      {
        title: "Entiende tus cifras",
        text: "Sesiones, tiempo entrenado y esfuerzo medio, siempre de la semana en curso. Si no registraste esfuerzo, verás «Sin dato».",
        demoLabel: "Tres cifras de la semana: sesiones, tiempo entrenado y esfuerzo medio.",
        demo: "athlete-weekly-figures",
      },
    ],
  },
  {
    key: "athlete-share-session",
    version: 1,
    since: "2026-11-17",
    platforms: ["mobile"],
    roles: ["athlete"],
    name: "Comparte tu sesión",
    slides: [
      {
        title: "Comparte tu sesión",
        text: "Al terminar, toca Compartir y llévate una imagen con el mapa de los músculos que trabajaste.",
        demoLabel: "En Hoy se toca Compartir y aparece la imagen de la sesión con el mapa de músculos.",
        demo: "athlete-share-button",
      },
      {
        title: "Elige el formato de tu foto",
        text: "Post, Historia, Sticker o Sin fondo. Los dos últimos son transparentes para pegarlos sobre tu foto.",
        demoLabel: "Se eligen cuatro formatos: Post, Historia, Sticker y Sin fondo; la vista previa cambia de forma.",
        demo: "athlete-share-formats",
      },
      {
        title: "Solo lo esencial",
        text: "Muestra ejercicios, series y duración. Nunca tus pesos, esfuerzo, notas ni tu nombre.",
        demoLabel: "Tres cifras de la sesión: ejercicios, series y duración.",
        demo: "athlete-share-data",
      },
    ],
  },
  {
    key: "coach-rm-percent",
    version: 1,
    since: "2026-11-20",
    platforms: ["web"],
    roles: ["coach"],
    name: "Carga como % del RM",
    slides: [
      {
        title: "Carga como % del RM",
        text: "Elige % del RM en cada fila y Cycles calcula el peso de cada atleta.",
        demoLabel: "Una fila de Sentadilla con 80 % RM muestra el peso calculado: 72,5 kg.",
        demo: "rm-percent-row",
      },
      {
        title: "El RM de cada atleta",
        text: "Regístralo en su ficha con la fecha de evaluación. Si no lo tienes, calcula uno aproximado.",
        demoLabel: "La ficha de una atleta lista su RM con la fecha de evaluación y el origen: Coach o Aproximado.",
        demo: "rm-athlete-sheet",
      },
      {
        title: "Una rutina para varios atletas",
        text: "Cada uno recibe su peso según su RM. Si a alguien le falta, te avisamos.",
        demoLabel: "La misma rutina para tres atletas: dos con su peso calculado y una con «Sin RM» y un aviso.",
        demo: "rm-multi-add",
      },
    ],
  },
  {
    key: "coach-teams",
    version: 1,
    since: "2026-11-25",
    platforms: ["web"],
    roles: ["coach"],
    name: "Equipos",
    slides: [
      {
        title: "Ahora puedes crear equipos",
        text: "Agrupa a tus atletas y dales la misma rutina a todos, cada uno con su peso.",
        demoLabel: "El selector de equipo abierto: los equipos con su cantidad de atletas y «Crear equipo» al final.",
        demo: "teams-group",
      },
      {
        title: "Crea uno desde Equipos",
        text: "Elige a los atletas que ya tienes. Invitar sigue en Atletas.",
        demoLabel: "Se escribe el nombre del equipo y se marcan tres atletas con casillas.",
        demo: "teams-create",
      },
    ],
  },
  {
    key: "athlete-rm-percent",
    version: 1,
    since: "2026-11-20",
    // Web (CYC-312) y app del atleta (CYC-313): cada una dibuja su propia demostración.
    platforms: ["web", "mobile"],
    roles: ["athlete"],
    name: "Tu peso, calculado",
    slides: [
      {
        title: "Tu peso, calculado",
        text: "Tu coach puede indicar un % de tu RM. Verás el peso ya calculado y redondeado para que calce con los discos.",
        demoLabel: "80 % de tu RM se convierte en 72,5 kg, tu peso.",
        demo: "athlete-rm-percent",
      },
    ],
  },
  {
    key: "cycle-calendar",
    version: 1,
    since: "2026-11-25",
    platforms: ["web"],
    roles: ["coach"],
    name: "Nuevo ciclo por calendario",
    slides: [
      {
        title: "Crea tu ciclo en un calendario",
        text: "Escribe el nombre y toca el primer y el último día. La duración sale sola.",
        demoLabel: "En un calendario se marca el primer día, se pinta el rango, se marca el último y aparece la duración.",
        demo: "cycle-range",
      },
      {
        title: "Menos cosas que rellenar",
        text: "Ya no pedimos tipo de ciclo ni sesiones por semana. A mano van el nombre y, si quieres, el objetivo.",
        demoLabel: "Los campos antiguos se apartan y quedan el nombre, el objetivo opcional y las fechas del ciclo.",
        demo: "cycle-fields",
      },
      {
        title: "Fechas sin sorpresas",
        text: "Un ciclo nuevo empieza desde hoy. Si al cambiar las fechas quedan sesiones fuera, muévelas o quítalas.",
        demoLabel: "Los días pasados no se pueden elegir. Al acortar el ciclo, tres sesiones quedan fuera y aparece un aviso.",
        demo: "cycle-guard",
      },
      {
        title: "Tus plantillas, por semanas",
        text: "Define cuántas semanas dura. Al asignarla, eliges solo el primer día.",
        demoLabel: "Una plantilla de dos semanas: se elige el primer día y el calendario pinta el resto.",
        demo: "cycle-template",
      },
    ],
  },
  {
    key: "coach-two-cycles",
    version: 1,
    since: "2026-11-25",
    platforms: ["web"],
    roles: ["coach"],
    name: "Dos ciclos por atleta",
    slides: [
      {
        title: "Los dos ciclos, a la vista",
        text: "Si un atleta lleva dos ciclos, su tarjeta muestra ambos, con la semana y las sesiones completadas de cada uno.",
        demoLabel: "La tarjeta de un atleta muestra un bloque por cada uno de sus dos ciclos.",
        demo: "two-cycles-card",
      },
      {
        title: "El aviso dice de qué ciclo es",
        text: "Así sabes dónde mirar. Con «Ver ciclos» abres su ficha y revisas cada uno.",
        demoLabel: "Sobre la tarjeta aparece el aviso de una sesión omitida con el nombre de su ciclo.",
        demo: "two-cycles-alert",
      },
    ],
  },
  {
    key: "athlete-two-cycles",
    version: 1,
    since: "2026-11-25",
    // Solo web: la app todavía muestra un plan a la vez.
    platforms: ["web"],
    roles: ["athlete"],
    name: "Dos ciclos en Hoy",
    slides: [
      {
        title: "Tus dos ciclos en Hoy",
        text: "Si llevas dos ciclos a la vez, ves las sesiones de ambos, cada una con el nombre de su ciclo.",
        demoLabel: "En Hoy aparecen dos tarjetas, cada una con el nombre de su ciclo.",
        demo: "two-cycles-today",
      },
      {
        title: "Empieza la que quieras",
        text: "Una va abierta con sus ejercicios. La otra aparece resumida, lista para ver o empezar.",
        demoLabel: "Una tarjeta está abierta y la otra resumida, con su botón para empezar.",
        demo: "two-cycles-start",
      },
    ],
  },
  {
    key: "coach-team-cycle",
    version: 1,
    since: "2026-11-25",
    platforms: ["web"],
    roles: ["coach"],
    name: "Ciclo del equipo",
    slides: [
      {
        title: "Planifica el ciclo de tu equipo",
        text: "Pon las sesiones una vez en el calendario del equipo y llegan a cada integrante.",
        demoLabel: "Una sesión del equipo llega a cuatro atletas.",
        demo: "team-cycle",
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
