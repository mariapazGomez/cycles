import { useQueries, useQuery } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as trackingApi from "../services/trackingApi";
import * as athletesApi from "../services/athletesApi";
import * as cyclesApi from "../services/cyclesApi";
import { loadAthleteWeek } from "../services/boardApi";
import { useDismissedAlerts } from "../components/AttentionList";
import type { BoardRow } from "../components/CoachWeekBoard";
import { buildAthleteRows, groupByAthlete } from "../lib/coachHome";
import { toLocalDay } from "../lib/calendar";
import { mondayOf } from "../lib/weekCalendar";
import { painSessionIds } from "../lib/weekBoard";

// Todos los atletas del coach con lo que se muestra de cada uno: su ciclo
// activo, sus sesiones de la semana y sus avisos de atención. Lo usan el Inicio
// y la pestaña Atletas, así los dos cuentan la misma historia.
export function useCoachRoster() {
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const { isDismissed, dismiss } = useDismissedAlerts();

  const todayIso = toLocalDay(new Date());
  const monday = mondayOf(todayIso);

  const visible = (attentionQuery.data ?? []).filter((item) => !isDismissed(item));
  const groups = groupByAthlete(visible);
  const baseRows = buildAthleteRows(
    athletesQuery.data ?? [],
    cyclesQuery.data ?? [],
    groups.map((g) => g.athlete.id),
  );

  const cyclesByAthlete = new Map<string, TrainingCycle[]>();
  for (const cycle of cyclesQuery.data ?? []) {
    cyclesByAthlete.set(cycle.athleteId, [...(cyclesByAthlete.get(cycle.athleteId) ?? []), cycle]);
  }

  // La semana de cada atleta con ciclo activo; se pide aparte para que la
  // lista aparezca de inmediato y cada tarjeta se llene cuando llegue.
  const weekQueries = useQueries({
    queries: baseRows.map((row) => ({
      queryKey: ["athletes", row.id, "board-week", monday],
      queryFn: () => loadAthleteWeek(cyclesByAthlete.get(row.id) ?? [], monday),
      enabled: row.hasPlan && row.status !== "pending" && cyclesQuery.isSuccess,
      staleTime: 60_000,
    })),
  });

  const pain = painSessionIds(visible);
  const rows: BoardRow[] = baseRows.map((row, i) => {
    const query = weekQueries[i];
    const activeCycle = (cyclesByAthlete.get(row.id) ?? []).find((c) => c.status === "active") ?? null;
    return {
      id: row.id,
      name: row.name,
      email: athletesQuery.data?.find((r) => r.athlete.id === row.id)?.athlete.email ?? "",
      status: row.status,
      cycleName: activeCycle?.name ?? null,
      cycle: activeCycle,
      week: query.data ? query.data.map((s) => ({ ...s, pain: pain.has(s.id) })) : null,
      weekLoading: query.isLoading && query.fetchStatus !== "idle",
      attention: groups.find((g) => g.athlete.id === row.id)?.items ?? [],
    };
  });

  return {
    rows,
    todayIso,
    monday,
    attentionGroups: groups,
    attentionError: attentionQuery.isError,
    listError: athletesQuery.isError,
    loading: attentionQuery.isLoading || athletesQuery.isLoading || cyclesQuery.isLoading,
    dismiss,
  };
}
