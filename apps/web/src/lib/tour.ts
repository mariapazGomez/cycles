// Guía de primer uso de la coach (CYC-191, CYC-214). Funciones puras: el avance
// se deriva de los datos (atletas, ciclos, rutinas); lo único que se guarda en
// la cuenta es `tourStatus`. Diseño en docs/diseno/tour-primer-uso (v3.1).

export type TourStepN = 1 | 2 | 3 | 4 | 5 | 6;

export const TOUR_STEP_COUNT = 6;

export interface TourCounts {
  // Atletas invitados (pendientes o activos).
  invited: number;
  // Atletas que ya aceptaron.
  activeAthletes: number;
  // Ciclos asignados a un atleta.
  athleteCycles: number;
  routines: number;
  // Rutinas con al menos un ejercicio.
  routinesWithExercises: number;
  // Ciclos con al menos una sesión asignada (un ciclo queda activo con la primera).
  activeCycles: number;
}

export interface TourStep {
  n: TourStepN;
  title: string;
  done: boolean;
  skipped: boolean;
}

export interface TourProgress {
  steps: TourStep[];
  // Primer paso sin hacer ni saltar; null si ya están todos.
  current: TourStepN | null;
  // Paso 2 sin atleta que haya aceptado: no se puede crear su ciclo todavía.
  waiting: boolean;
}

export const TOUR_TITLES: Record<TourStepN, string> = {
  1: "Invita a tu atleta",
  2: "Crea su ciclo",
  3: "Crea una rutina",
  4: "Agrega ejercicios",
  5: "Ponla en un día",
  6: "Mira cómo le va",
};

export const TOUR_LEVEL: Partial<Record<TourStepN, string>> = {
  2: "Ciclo",
  3: "Rutina",
  4: "Ejercicios",
  5: "Rutina en un día",
};

export function tourProgress(counts: TourCounts, skipped: readonly number[] = []): TourProgress {
  // El paso 6 no se deriva de datos: termina con «Entendido» en el cierre.
  const done = [
    counts.invited > 0,
    counts.athleteCycles > 0,
    counts.routines > 0,
    counts.routinesWithExercises > 0,
    counts.activeCycles > 0,
    false,
  ];
  const steps: TourStep[] = ([1, 2, 3, 4, 5, 6] as const).map((n) => ({
    n,
    title: TOUR_TITLES[n],
    done: done[n - 1],
    skipped: !done[n - 1] && skipped.includes(n),
  }));
  const first = steps.find((s) => !s.done && !s.skipped);
  const current = first ? first.n : null;
  return { steps, current, waiting: current === 2 && counts.activeAthletes === 0 };
}

export function hasNoData(counts: TourCounts, cyclesTotal: number): boolean {
  return counts.routines === 0 && counts.invited === 0 && counts.activeAthletes === 0 && cyclesTotal === 0;
}

// La guía se ofrece solo a coaches que no la saltaron ni la terminaron, y que
// o ya la empezaron o llegan sin rutinas, atletas ni ciclos.
export function tourIsActive(input: { isCoach: boolean; status: string | undefined; started: boolean; noData: boolean }): boolean {
  return input.isCoach && input.status === "pending" && (input.started || input.noData);
}

// Lo que la guía recuerda de cada cuenta en el navegador: si ya empezó, los
// pasos que se saltó, si vio el Resumen (paso 6) y si está en pausa. Se comparte
// entre todo lo que la lee. Si el navegador no deja guardarlo, queda en memoria
// durante la sesión y, al recargar, la guía solo se ofrece mientras la cuenta
// no tenga datos.
export interface TourLocal {
  started: boolean;
  skipped: number[];
  summarySeen: boolean;
  paused: boolean;
}

const EMPTY: TourLocal = { started: false, skipped: [], summarySeen: false, paused: false };
const key = (userId: string) => `cycles.tour.local.${userId}`;
const legacyKey = (userId: string) => `cycles.tour.started.${userId}`;
const cache = new Map<string, TourLocal>();
const listeners = new Set<() => void>();

export function subscribeLocal(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readLocal(userId: string): TourLocal {
  if (!userId) return EMPTY;
  const cached = cache.get(userId);
  if (cached) return cached;
  let value = EMPTY;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TourLocal>;
      value = {
        started: parsed.started === true,
        skipped: Array.isArray(parsed.skipped) ? parsed.skipped.filter((n) => typeof n === "number") : [],
        summarySeen: parsed.summarySeen === true,
        // La pausa no sobrevive a una recarga.
        paused: false,
      };
    } else if (window.localStorage.getItem(legacyKey(userId)) === "1") {
      value = { ...EMPTY, started: true };
    }
  } catch {
    // Sin almacenamiento o con datos dañados: se parte de cero.
  }
  cache.set(userId, value);
  return value;
}

export function writeLocal(userId: string, patch: Partial<TourLocal>): void {
  if (!userId) return;
  const next = { ...readLocal(userId), ...patch };
  cache.set(userId, next);
  try {
    window.localStorage.setItem(key(userId), JSON.stringify({ ...next, paused: false }));
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  listeners.forEach((listener) => listener());
}

export function clearLocal(userId: string): void {
  if (!userId) return;
  cache.set(userId, EMPTY);
  try {
    window.localStorage.removeItem(key(userId));
    window.localStorage.removeItem(legacyKey(userId));
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  listeners.forEach((listener) => listener());
}
