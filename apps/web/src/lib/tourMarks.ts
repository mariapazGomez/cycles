// Marcas de la guía de primer uso (CYC-214): cada una resalta un elemento real
// de la interfaz, identificado con `data-tour="…"`, y dice qué hacer. Cuál se
// muestra se decide con la ruta y con lo que hay en pantalla; el avance entre
// pasos sale de los datos (lib/tour.ts). Diseño: docs/diseno/tour-primer-uso.

import type { TourStepN } from "./tour";

export interface MarkContext {
  path: string;
  // ¿Hay en pantalla (y a la vista) un elemento con ese ancla?
  has: (anchor: string) => boolean;
  // Cuántos elementos con ese ancla hay en pantalla.
  count: (anchor: string) => number;
  // Valor escrito en un campo de la pantalla ("" si no está).
  value: (selector: string) => string;
  // Atleta que ya aceptó (el primero) y atleta que aún no.
  athleteId: string | null;
  athleteName: string | null;
  pendingName: string | null;
  summarySeen: boolean;
}

export interface Mark {
  id: string;
  // Número que se muestra: «Paso N de 6».
  step: TourStepN;
  // Pasos de datos en los que esta marca puede salir (la página de la rutina
  // cubre los pasos 3 y 4: la rutina nace con sus ejercicios).
  during: TourStepN[];
  level?: string;
  selector: (c: MarkContext) => string;
  text: (c: MarkContext) => string;
  when: (c: MarkContext) => boolean;
  // Avanza con «Siguiente» (no hay una acción que detectar).
  manual?: boolean;
  // Tocar el elemento resaltado ya cumple la marca.
  completeOnClick?: "summary";
  // Cierre: el botón guarda la guía como completada.
  closing?: boolean;
}

const tour = (anchor: string) => `[data-tour="${anchor}"]`;
const onAthletes = (c: MarkContext) => c.path === "/athletes";
const onAthletePage = (c: MarkContext) => /^\/athletes\/[^/]+\/?$/.test(c.path);

const inviteFilled = (c: MarkContext) => c.value("#athleteName") !== "" && c.value("#athleteEmail") !== "";

export const MARKS: Mark[] = [
  // 1 · Tu atleta
  {
    id: "1a",
    step: 1,
    during: [1],
    selector: () => tour("nav-athletes"),
    text: () => "Primero, tu atleta. Entra a Atletas.",
    when: (c) => !c.path.startsWith("/athletes"),
  },
  {
    id: "1a2",
    step: 1,
    during: [1],
    selector: () => tour("invite-open"),
    text: () => "Toca Invitar atleta.",
    when: (c) => onAthletes(c) && !c.has("invite-form") && c.has("invite-open"),
  },
  {
    id: "1c",
    step: 1,
    during: [1],
    selector: () => tour("invite-send"),
    text: () => "Toca Enviar invitación.",
    when: (c) => onAthletes(c) && c.has("invite-send") && inviteFilled(c),
  },
  {
    id: "1b",
    step: 1,
    during: [1],
    selector: () => tour("invite-form"),
    text: () => "Escribe su nombre y el email con el que se registrará.",
    when: (c) => onAthletes(c) && c.has("invite-form"),
  },

  // 2 · Ciclo
  {
    id: "2a0",
    step: 2,
    during: [2],
    level: "Ciclo",
    selector: () => tour("nav-athletes"),
    text: (c) => `Entra a Atletas para crearle un ciclo a ${c.athleteName ?? "tu atleta"}.`,
    when: (c) => !c.path.startsWith("/athletes"),
  },
  {
    id: "2a",
    step: 2,
    during: [2],
    level: "Ciclo",
    selector: (c) => `${tour("athlete-row")}[data-tour-id="${c.athleteId}"]`,
    text: (c) => `Abre a ${c.athleteName ?? "tu atleta"} para crearle un ciclo.`,
    when: (c) => onAthletes(c) && c.athleteId !== null,
  },
  {
    id: "2c",
    step: 2,
    during: [2],
    level: "Ciclo",
    selector: () => tour("cycle-create"),
    text: () => "Ponle nombre, inicio y semanas. Luego toca Crear ciclo.",
    when: (c) => c.has("cycle-create"),
  },
  {
    id: "2b",
    step: 2,
    during: [2],
    level: "Ciclo",
    selector: () => tour("new-cycle"),
    text: () => "Toca Nuevo ciclo.",
    when: (c) => onAthletePage(c) && c.has("new-cycle"),
  },

  // 3 · Rutina (y 4 · Ejercicios, que se hacen en la página de la rutina)
  {
    id: "4c",
    step: 4,
    during: [3, 4],
    level: "Ejercicios",
    selector: () => tour("drawer-save"),
    text: () => "Cuando termines, toca Guardar rutina.",
    when: (c) => c.has("drawer") && c.count("drawer-row") > 0 && !c.has("exercise-create"),
  },
  {
    id: "4b",
    step: 4,
    during: [3, 4],
    level: "Ejercicios",
    selector: () => tour("exercise-create"),
    text: () => "¿Falta uno? Toca Crear para sumarlo a la rutina.",
    when: (c) => c.has("drawer") && c.has("exercise-create"),
  },
  {
    id: "4a",
    step: 4,
    during: [3, 4],
    level: "Ejercicios",
    selector: () => tour("drawer-exercises"),
    text: () => "Busca y agrega 2 o 3 ejercicios.",
    when: (c) => c.has("drawer") && c.value("#bd-r-name") !== "" && c.count("drawer-row") === 0,
  },
  {
    id: "3c",
    step: 3,
    during: [3, 4],
    level: "Rutina",
    selector: () => tour("drawer-name"),
    text: () => "Ponle nombre. Por ejemplo, Torso A.",
    when: (c) => c.has("drawer") && c.value("#bd-r-name") === "" && c.count("drawer-row") === 0,
  },
  {
    id: "3b",
    step: 3,
    during: [3],
    level: "Rutina",
    selector: (c) => (c.has("new-routine") ? tour("new-routine") : tour("picker-create")),
    text: () => "Crea la rutina de ese día.",
    when: (c) => onAthletePage(c) && !c.has("drawer") && c.has("routine-picker"),
  },
  {
    id: "3a",
    step: 3,
    during: [3],
    level: "Rutina",
    selector: () => tour("day-plus"),
    text: () => "Toca «+» en un día.",
    when: (c) => onAthletePage(c) && !c.has("drawer") && !c.has("routine-picker") && c.has("day-plus"),
  },

  // 5 · Ponla en un día
  {
    id: "5b",
    step: 5,
    during: [5],
    level: "Rutina en un día",
    selector: () => tour("picker-item"),
    text: () => "Elige la rutina para ese día.",
    when: (c) => onAthletePage(c) && !c.has("drawer") && c.has("picker-item"),
  },
  {
    id: "5a",
    step: 5,
    during: [5],
    level: "Rutina en un día",
    selector: () => tour("day-plus"),
    text: () => "Toca «+» en un día y elige tu rutina.",
    when: (c) => onAthletePage(c) && !c.has("drawer") && !c.has("routine-picker") && c.has("day-plus"),
  },

  // 6 · Seguimiento
  {
    id: "6a",
    step: 6,
    during: [6],
    selector: () => tour("view-summary"),
    text: () => "En Resumen ves su carga y adherencia.",
    when: (c) => !c.summarySeen && onAthletePage(c) && c.has("view-summary"),
    manual: true,
    completeOnClick: "summary",
  },
  {
    id: "6b",
    step: 6,
    during: [6],
    selector: () => tour("nav-home"),
    text: () => "En Inicio ves quién necesita tu atención.",
    when: (c) => c.path !== "/" && (c.summarySeen || !onAthletePage(c)),
  },
  {
    id: "6c",
    step: 6,
    during: [6],
    selector: () => tour("avatar"),
    text: () => "Listo. Reabre la guía en Cómo usar Cycles.",
    when: (c) => c.path === "/",
    closing: true,
  },
];

// Guía del atleta en la web (CYC-233): tres marcas sobre el menú, con el mismo
// globo que la de la coach. El menú existe con o sin ciclo asignado, así que
// siempre hay dónde apuntar. Textos: los mismos que explicaba la tarjeta de Hoy.
export const ATHLETE_STEP_COUNT = 3;

export const ATHLETE_MARKS: Mark[] = [
  {
    id: "a1",
    step: 1,
    during: [1],
    selector: () => tour("athlete-today"),
    text: () => "Aquí está tu sesión de hoy. Toca Empezar sesión cuando vayas a entrenar.",
    when: () => true,
    manual: true,
  },
  {
    id: "a2",
    step: 2,
    during: [2],
    selector: () => tour("athlete-calendar"),
    text: () => "Ves tu semana y todo tu ciclo.",
    when: () => true,
    manual: true,
  },
  {
    id: "a3",
    step: 3,
    during: [3],
    selector: () => tour("athlete-cycles"),
    text: () => "Los ciclos que tu coach te asignó, con tu avance.",
    when: () => true,
    closing: true,
  },
];

export function athleteMark(step: number): Mark | null {
  return ATHLETE_MARKS.find((m) => m.step === step) ?? null;
}

export function pickMark(current: TourStepN, ctx: MarkContext): Mark | null {
  return MARKS.find((m) => m.during.includes(current) && m.when(ctx)) ?? null;
}

// Dónde lleva «Volver al paso N» cuando la coach se salió del camino.
export function stepPath(step: TourStepN, athleteId: string | null): string {
  if (step === 1) return "/athletes";
  if (step === 6) return "/";
  return athleteId ? `/athletes/${athleteId}` : "/athletes";
}
