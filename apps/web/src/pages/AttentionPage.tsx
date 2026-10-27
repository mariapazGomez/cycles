import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as trackingApi from "../services/trackingApi";
import * as athletesApi from "../services/athletesApi";
import * as cyclesApi from "../services/cyclesApi";
import { loadAthleteWeek } from "../services/boardApi";
import { useDismissedAlerts } from "../components/AttentionList";
import { CoachHero } from "../components/CoachHero";
import { BoardRow, CoachWeekBoard } from "../components/CoachWeekBoard";
import { CoachBoardSkeleton, Skeleton, SlowNotice } from "../components/Skeleton";
import { usePageBackground } from "../hooks/usePageBackground";
import { buildAthleteRows, groupByAthlete } from "../lib/coachHome";
import { toLocalDay } from "../lib/calendar";
import { mondayOf } from "../lib/weekCalendar";
import { painSessionIds, todaySummary } from "../lib/weekBoard";

// Inicio del coach: responde "¿a quién miro primero?" y "¿cómo va la semana?".
// Arriba, las sesiones de hoy y cuántos atletas necesitan atención; abajo, la
// semana de todos tus atletas, una tarjeta por atleta, con los que necesitan
// atención primero. Ver docs/diseno/ciclo-en-calendario y
// docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.2.
export function AttentionPage() {
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);

  usePageBackground();

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
      status: row.status,
      cycleName: activeCycle?.name ?? null,
      week: query.data ? query.data.map((s) => ({ ...s, pain: pain.has(s.id) })) : null,
      weekLoading: query.isLoading && query.fetchStatus !== "idle",
      attention: groups.find((g) => g.athlete.id === row.id)?.items ?? [],
    };
  });

  const hasAthletes = baseRows.length > 0;
  const loading = attentionQuery.isLoading || athletesQuery.isLoading || cyclesQuery.isLoading;
  const weeksReady = rows.every((r) => !r.weekLoading);
  const today = weeksReady ? todaySummary(rows.map((r) => r.week), todayIso) : null;

  return (
    <div className="hm-page">
      <div className="page-header">
        <h1 className="page-title">Inicio</h1>
        {hasAthletes && (
          <Link className="button-secondary hm-invite" to="/athletes">
            Invitar atleta
          </Link>
        )}
      </div>

      {attentionQuery.isError && <div className="error-banner">No pudimos cargar tus avisos. Revisa tu conexión e inténtalo de nuevo.</div>}

      {loading ? (
        <>
          <div className="cy-strip cy-sk-strip" aria-busy="true" aria-label="Cargando tu resumen">
            <Skeleton width={150} height={24} />
            <Skeleton width={260} height={12} />
          </div>
          <CoachBoardSkeleton />
          <SlowNotice />
        </>
      ) : (
        <>
          {!attentionQuery.isError && <CoachHero attentionCount={groups.length} hasAthletes={hasAthletes} today={today} />}

          {applied && (
            <div className="success-banner" role="status">
              <strong>Ajuste aplicado.</strong> {applied}
            </div>
          )}

          {hasAthletes && (
            <CoachWeekBoard rows={rows} monday={monday} todayIso={todayIso} onDismiss={dismiss} onApplied={setApplied} />
          )}
        </>
      )}
    </div>
  );
}
