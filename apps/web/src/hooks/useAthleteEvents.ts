import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AthleteEventOccurrence } from "@cycles/shared";
import * as eventsApi from "../services/eventsApi";
import { rangeChunks } from "../lib/rangeChunks";

// Actividades del atleta en un rango de fechas (CYC-253), con el tipo compartido de @cycles/shared.
export function useAthleteEvents(athleteId: string, from: string, to: string, enabled = true) {
  const chunks = useMemo(() => rangeChunks(from, to), [from, to]);
  const queries = useQueries({
    queries: chunks.map((c) => ({
      queryKey: ["athletes", athleteId, "events", c.from, c.to],
      queryFn: () => eventsApi.getAthleteEvents(athleteId, c.from, c.to),
      enabled,
      staleTime: 60_000,
    })),
  });
  const events = useMemo<AthleteEventOccurrence[]>(() => queries.flatMap((q) => q.data?.events ?? []), [queries]);
  return {
    events,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => void q.refetch()),
  };
}
