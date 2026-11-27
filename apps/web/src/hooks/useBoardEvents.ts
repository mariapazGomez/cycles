import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AthleteEventOccurrence, TrainingCycle } from "@cycles/shared";
import * as boardApi from "../services/boardApi";
import { useRosterSessions } from "./useBoardSessions";
import { addDays } from "../lib/eventCalendar";
import { heavyThreshold, isDemanding, loadClashes, type LoadClash } from "../lib/loadClash";

// Actividades de cada atleta en la semana del Inicio del coach (CYC-253): una sola consulta para
// todos (solo lectura, sin notas). El choque de carga usa las series de las sesiones del coach, que
// llegan con la misma consulta de las semanas del tablero.
export interface BoardEvents {
  events: AthleteEventOccurrence[];
  clashes: LoadClash[];
  loading: boolean;
  error: boolean;
}

export function useBoardEvents(
  athletes: Array<{ id: string; cycle: TrainingCycle | null; enabled: boolean }>,
  monday: string,
  layerOn: boolean,
): { byAthlete: Map<string, BoardEvents>; anyError: boolean; clashError: boolean; refetch: () => void } {
  const sunday = addDays(monday, 6);
  const wanted = layerOn && athletes.some((a) => a.enabled);
  const eventsQuery = useQuery({
    queryKey: ["athletes", "board-events", monday, sunday],
    queryFn: () => boardApi.getBoardEvents(monday, sunday),
    enabled: wanted,
    staleTime: 60_000,
  });

  const eventsOf = (id: string) => (eventsQuery.data ?? []).filter((e) => e.athleteId === id);
  const needsClash = athletes.map((a) => a.enabled && Boolean(a.cycle) && eventsOf(a.id).some(isDemanding));
  const sessionsQuery = useRosterSessions(monday, layerOn && needsClash.some(Boolean));

  const byAthlete = useMemo(() => {
    const map = new Map<string, BoardEvents>();
    athletes.forEach((a, i) => {
      const events = layerOn && a.enabled ? eventsOf(a.id) : [];
      let clashes: LoadClash[] = [];
      const data = sessionsQuery.data;
      if (layerOn && needsClash[i] && a.cycle && data) {
        const volumes = data.cycles.find((c) => c.id === a.cycle?.id)?.datedVolumes ?? [];
        clashes = loadClashes(boardApi.cycleCoachSessions(data, a.cycle.id), events, heavyThreshold(volumes.map((volume) => ({ volume }))));
      }
      map.set(a.id, {
        events,
        clashes,
        loading: layerOn && a.enabled && eventsQuery.isLoading,
        error: layerOn && a.enabled && eventsQuery.isError,
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes.map((a) => `${a.id}:${a.enabled}:${a.cycle?.id}`).join(), layerOn, eventsQuery.data, eventsQuery.isError, eventsQuery.isLoading, sessionsQuery.data]);

  // Sin las sesiones no se pueden revisar los choques: que no parezca que no hay.
  const clashError = layerOn && needsClash.some(Boolean) && sessionsQuery.isError;
  return {
    byAthlete,
    anyError: wanted && eventsQuery.isError,
    clashError,
    refetch: () => {
      if (eventsQuery.isError) void eventsQuery.refetch();
      if (sessionsQuery.isError) void sessionsQuery.refetch();
    },
  };
}
