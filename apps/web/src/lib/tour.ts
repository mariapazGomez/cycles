// Guía de primer uso de la coach (CYC-191). Funciones puras: el avance se
// deriva de los datos (rutinas, invitaciones, atletas, ciclos); lo único que se
// guarda en la cuenta es `tourStatus`. Diseño en docs/diseno/tour-primer-uso.

export interface TourCounts {
  routines: number;
  // Atletas invitados (pendientes o activos).
  invited: number;
  // Atletas que ya aceptaron.
  activeAthletes: number;
  // Ciclos activos (un ciclo queda activo al asignar su primera sesión).
  activeCycles: number;
}

export interface TourStep {
  n: 1 | 2 | 3 | 4;
  title: string;
  done: boolean;
}

export interface TourProgress {
  steps: TourStep[];
  // Primer paso sin hacer; null si ya están los cuatro.
  current: 1 | 2 | 3 | 4 | null;
}

export const TOUR_TITLES: Record<1 | 2 | 3 | 4, string> = {
  1: "Crea tu primera rutina",
  2: "Invita a tu atleta",
  3: "Espera su aceptación",
  4: "Crea su ciclo y asigna la primera sesión",
};

export const TOUR_BAR_TEXT: Record<1 | 2 | 3 | 4, string> = {
  1: "Una rutina es una sesión que armas una vez y reutilizas. Empieza con 2 o 3 ejercicios.",
  2: "Escribe su nombre y su email, el mismo con el que se registre. Le llega un correo para entrar.",
  3: "Tu atleta aún no acepta. Mientras tanto, arma más rutinas.",
  4: "Crea el ciclo y toca «+» en un día para asignar una rutina. Con la primera sesión, el ciclo queda activo.",
};

export function tourProgress(counts: TourCounts): TourProgress {
  const done = [counts.routines > 0, counts.invited > 0, counts.activeAthletes > 0, counts.activeCycles > 0];
  const steps = ([1, 2, 3, 4] as const).map((n) => ({ n, title: TOUR_TITLES[n], done: done[n - 1] }));
  const first = steps.find((s) => !s.done);
  return { steps, current: first ? first.n : null };
}

export function hasNoData(counts: TourCounts, cyclesTotal: number): boolean {
  return counts.routines === 0 && counts.invited === 0 && counts.activeAthletes === 0 && cyclesTotal === 0;
}

// La guía se ofrece solo a coaches que no la saltaron ni la terminaron, y que
// o ya la empezaron o llegan sin rutinas, atletas ni ciclos.
export function tourIsActive(input: { isCoach: boolean; status: string | undefined; started: boolean; noData: boolean }): boolean {
  return input.isCoach && input.status === "pending" && (input.started || input.noData);
}

// Marca de «ya empezó» (por cuenta), en el navegador y compartida entre todo lo
// que la lee. Si el navegador no deja guardarla, queda en memoria durante la
// sesión y, al recargar, la guía solo se ofrece mientras la cuenta no tenga datos.
const key = (userId: string) => `cycles.tour.started.${userId}`;
const memory = new Map<string, boolean>();
const listeners = new Set<() => void>();

export function subscribeStarted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readStarted(userId: string): boolean {
  if (!userId) return false;
  if (memory.has(userId)) return memory.get(userId) === true;
  try {
    return window.localStorage.getItem(key(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeStarted(userId: string, value: boolean): void {
  memory.set(userId, value);
  try {
    if (value) window.localStorage.setItem(key(userId), "1");
    else window.localStorage.removeItem(key(userId));
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  listeners.forEach((listener) => listener());
}
