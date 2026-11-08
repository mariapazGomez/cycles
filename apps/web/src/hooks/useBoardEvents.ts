import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AthleteEventOccurrence, TrainingCycle } from "@cycles/shared";
import * as eventsApi from "../services/eventsApi";
import * as sessionsApi from "../services/sessionsApi";
import * as trackingApi from "../services/trackingApi";
import { addDays } from "../lib/eventCalendar";
import { coachSessionsOf } from "../lib/coachSessions";
import { isDemanding, loadClashes, type LoadClash } from "../lib/loadClash";

// Actividades de cada atleta en la semana del Inicio del coach (CYC-253): una consulta por atleta
// (`GET /athletes/:id/events`, solo lectura, sin notas). El choque de carga necesita el volumen de
// las sesiones del coach; esas consultas se piden solo para quien tiene esta semana una actividad
// exigente (intensidad alta o partido), no para todos.
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
): { byAthlete: Map<string, BoardEvents>; anyError: boolean; refetch: () => void } {
  const sunday = addDays(monday, 6);
  const eventQueries = useQueries({
    queries: athletes.map((a) => ({
      queryKey: ["athletes", a.id, "events", monday, sunday],
      queryFn: () => eventsApi.getAthleteEvents(a.id, monday, sunday),
      enabled: layerOn && a.enabled,
      staleTime: 60_000,
    })),
  });

  const needsClash = athletes.map((a, i) => Boolean(a.cycle) && (eventQueries[i]?.data?.events ?? []).some(isDemanding));
  const sessionQueries = useQueries({
    queries: athletes.map((a, i) => ({
      queryKey: ["cycles", a.cycle?.id ?? "none", "sessions"],
      queryFn: () => sessionsApi.listSessions(a.cycle?.id ?? ""),
      enabled: layerOn && needsClash[i],
    })),
  });
  const progressQueries = useQueries({
    queries: athletes.map((a, i) => ({
      queryKey: ["cycles", a.cycle?.id ?? "none", "progress"],
      queryFn: () => trackingApi.getCycleProgress(a.cycle?.id ?? ""),
      enabled: layerOn && needsClash[i],
    })),
  });

  const stamp = [...eventQueries, ...sessionQueries, ...progressQueries].map((q) => q.dataUpdatedAt).join();
  const byAthlete = useMemo(() => {
    const map = new Map<string, BoardEvents>();
    athletes.forEach((a, i) => {
      const events = layerOn ? (eventQueries[i]?.data?.events ?? []) : [];
      const coach = coachSessionsOf(sessionQueries[i]?.data ?? [], progressQueries[i]?.data);
      map.set(a.id, {
        events,
        clashes: layerOn && needsClash[i] ? loadClashes(coach, events) : [],
        loading: layerOn && a.enabled && Boolean(eventQueries[i]?.isLoading),
        error: layerOn && a.enabled && Boolean(eventQueries[i]?.isError),
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes.map((a) => a.id).join(), layerOn, stamp]);

  return {
    byAthlete,
    anyError: layerOn && eventQueries.some((q) => q.isError),
    refetch: () => eventQueries.forEach((q) => void q.refetch()),
  };
}
