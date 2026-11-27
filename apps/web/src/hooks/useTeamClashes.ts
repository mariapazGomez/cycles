import type { TeamCalendarResponse, TrainingCycle } from "@cycles/shared";
import * as boardApi from "../services/boardApi";
import { useBoardSessions } from "./useBoardSessions";
import type { TeamAthlete } from "../services/teamsApi";
import { addDays } from "../lib/eventCalendar";
import { cyclesOverlapping } from "../lib/coachSessions";
import { heavyThreshold, isDemanding, loadClashes, type LoadClash } from "../lib/loadClash";
import { eventsForClash } from "../lib/teamEvents";

export interface AthleteClashes {
  athleteId: string;
  name: string;
  clashes: LoadClash[];
}

// Choque de carga de la semana, con la misma regla que el Inicio del coach (CYC-253). Las sesiones
// del equipo se piden de una vez, y solo si esa semana alguien tiene algo exigente (partido o
// intensidad alta).
export function useTeamClashes(
  teamId: string,
  athletes: TeamAthlete[],
  cycles: TrainingCycle[],
  data: TeamCalendarResponse | undefined,
  from: string,
  to: string,
): { clashes: AthleteClashes[]; failed: boolean; retry: () => void } {
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

  const sessions = useBoardSessions(addDays(from, -1), addDays(to, 1), { teamId, volumes: true, enabled: pairs.length > 0 });
  const board = sessions.data;
  const clashesOf = (cycleId: string, events: Parameters<typeof loadClashes>[1]) => {
    if (!board) return [];
    const volumes = board.cycles.find((c) => c.id === cycleId)?.datedVolumes ?? [];
    return loadClashes(boardApi.cycleCoachSessions(board, cycleId), events, heavyThreshold(volumes.map((volume) => ({ volume }))));
  };

  const clashes = candidates
    .map((c) => ({
      athleteId: c.athlete.id,
      name: c.athlete.name,
      // Con el día de margen, solo cuenta lo que toca la semana que se mira.
      clashes: pairs
        .flatMap((p) => (p.athleteId === c.athlete.id ? clashesOf(p.cycleId, c.events) : []))
        .filter((x) => (x.sessionDate >= from && x.sessionDate <= to) || (x.eventDate >= from && x.eventDate <= to)),
    }))
    .filter((c) => c.clashes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return { clashes, failed: pairs.length > 0 && sessions.isError, retry: () => void sessions.refetch() };
}
