import type { AthleteEventOccurrence } from "@cycles/shared";
import { INTENSITY_LABEL, addDays, longDay } from "./eventCalendar";

// Choque de carga (CYC-253, diseño docs/diseno/eventos-paralelos, CYC-270): una actividad de
// intensidad alta, o un partido, el mismo día, el día antes o el día siguiente de una sesión del
// coach con volumen en el tercio más alto del ciclo. Es solo un aviso: no cambia nada.

export interface CoachSession {
  id: string;
  name: string;
  // Día de la sesión («AAAA-MM-DD»).
  date: string;
  // Volumen planificado (series totales de la sesión).
  volume: number;
}

export interface LoadClash {
  // Día de la sesión pesada y día de la actividad que choca.
  sessionDate: string;
  eventDate: string;
  session: CoachSession;
  event: AthleteEventOccurrence;
}

// Se necesitan al menos 3 sesiones con volumen para hablar de «tercio más alto».
const MIN_SESSIONS = 3;

// Umbral de volumen del tercio más alto: el menor volumen que aún queda en ese tercio.
export function heavyThreshold(sessions: CoachSession[]): number | null {
  const volumes = sessions.map((s) => s.volume).filter((v) => v > 0).sort((a, b) => b - a);
  if (volumes.length < MIN_SESSIONS) return null;
  const topCount = Math.ceil(volumes.length / 3);
  const threshold = volumes[topCount - 1];
  const lowest = volumes[volumes.length - 1];
  if (threshold !== lowest) return threshold;
  // El tercio más alto llega hasta el volumen más bajo: ahí hay un empate y no todas pueden ser
  // «las más altas». Pesadas son solo las que pesan más que el mínimo; si todas pesan igual, ninguna.
  const higher = volumes.filter((v) => v > lowest);
  return higher.length > 0 ? Math.min(...higher) : null;
}

export const isHeavy = (session: CoachSession, threshold: number | null) => threshold !== null && session.volume >= threshold;

// Actividades que cuentan para un choque: intensidad alta o partido.
export const isDemanding = (event: Pick<AthleteEventOccurrence, "type" | "intensity">) => event.type === "match" || event.intensity === "high";

export function loadClashes(sessions: CoachSession[], events: AthleteEventOccurrence[]): LoadClash[] {
  const threshold = heavyThreshold(sessions);
  if (threshold === null) return [];
  const result: LoadClash[] = [];
  for (const session of sessions.filter((s) => isHeavy(s, threshold))) {
    const days = [addDays(session.date, -1), session.date, addDays(session.date, 1)];
    for (const event of events) {
      if (isDemanding(event) && days.includes(event.date)) {
        result.push({ sessionDate: session.date, eventDate: event.date, session, event });
      }
    }
  }
  return result.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.eventDate.localeCompare(b.eventDate));
}

// Días (de sesión o de actividad) que llevan el aviso.
export function clashDays(clashes: LoadClash[]): Set<string> {
  return new Set(clashes.flatMap((c) => [c.sessionDate, c.eventDate]));
}

const dayWord = (iso: string) => longDay(iso).split(" ")[0];

// «Piernas pesadas el viernes y partido de liga el sábado, intensidad alta (y 1 más).»
export function clashSentence(clashes: LoadClash[]): string {
  const first = clashes[0];
  const extra = clashes.length > 1 ? ` (y ${clashes.length - 1} más)` : "";
  return `${first.session.name} el ${dayWord(first.sessionDate)} y ${first.event.title.toLowerCase()} el ${dayWord(first.eventDate)}, intensidad ${INTENSITY_LABEL[first.event.intensity ?? "high"]}${extra}.`;
}
