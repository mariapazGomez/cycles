import { useQueries } from "@tanstack/react-query";
import type { TeamCalendarResponse, TrainingCycle } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import * as trackingApi from "../services/trackingApi";
import type { TeamAthlete } from "../services/teamsApi";
import { addDays } from "../lib/eventCalendar";
import { coachSessionsOf, cyclesOverlapping } from "../lib/coachSessions";
import { isDemanding, loadClashes, type LoadClash } from "../lib/loadClash";
import { eventsForClash } from "../lib/teamEvents";

export interface AthleteClashes {
  athleteId: string;
  name: string;
  clashes: LoadClash[];
}

// Choque de carga de la semana, con la misma regla que el Inicio del coach (CYC-253). Las sesiones
// se piden solo para quien tiene esa semana algo exigente (partido o intensidad alta).
export function useTeamClashes(athletes: TeamAthlete[], cycles: TrainingCycle[], data: TeamCalendarResponse | undefined, from: string, to: string): AthleteClashes[] {
  const candidates = athletes
    .filter((a) => a.status === "active")
    .map((a) => ({ athlete: a, events: data ? eventsForClash(data, a.id).filter(isDemanding) : [] }))
    .filter((c) => c.events.length > 0);
  // El volumen «alto» se mide dentro de cada ciclo.
  const pairs = candidates.flatMap((c) =>
    cyclesOverlapping(
      cycles.filter((cycle) => cycle.athleteId === c.athlete.id && cycle.status === "active"),
      addDays(from, -1),
      addDays(to, 1),
    ).map((cycle) => ({ athleteId: c.athlete.id, cycleId: cycle.id })),
  );

  const sessionQueries = useQueries({
    queries: pairs.map((p) => ({ queryKey: ["cycles", p.cycleId, "sessions"], queryFn: () => sessionsApi.listSessions(p.cycleId) })),
  });
  const progressQueries = useQueries({
    queries: pairs.map((p) => ({ queryKey: ["cycles", p.cycleId, "progress"], queryFn: () => trackingApi.getCycleProgress(p.cycleId) })),
  });

  return candidates
    .map((c) => ({
      athleteId: c.athlete.id,
      name: c.athlete.name,
      // Con el día de margen, solo cuenta lo que toca la semana que se mira.
      clashes: pairs
        .flatMap((p, i) => (p.athleteId === c.athlete.id ? loadClashes(coachSessionsOf(sessionQueries[i]?.data ?? [], progressQueries[i]?.data), c.events) : []))
        .filter((x) => (x.sessionDate >= from && x.sessionDate <= to) || (x.eventDate >= from && x.eventDate <= to)),
    }))
    .filter((c) => c.clashes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
