import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import * as trackingApi from "../services/trackingApi";
import * as athletesApi from "../services/athletesApi";
import * as cyclesApi from "../services/cyclesApi";
import { AttentionList, useDismissedAlerts } from "../components/AttentionList";
import { CoachHero } from "../components/CoachHero";
import { CoachAthletesPanel, WeekProgress } from "../components/CoachAthletesPanel";
import { usePageBackground } from "../hooks/usePageBackground";
import { buildAthleteRows, currentWeek, groupByAthlete } from "../lib/coachHome";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Inicio del coach: responde "¿a quién miro primero?". Arriba, cuántos atletas
// necesitan atención y por quién empezar; abajo, la cola de avisos por atleta
// y, al lado, todos sus atletas con la semana en curso.
// Ver docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.2.
export function AttentionPage() {
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);

  usePageBackground();

  const visible = (attentionQuery.data ?? []).filter((item) => !isDismissed(item));
  const groups = groupByAthlete(visible);
  const rows = buildAthleteRows(
    athletesQuery.data ?? [],
    cyclesQuery.data ?? [],
    groups.map((g) => g.athlete.id),
  );

  // El avance de la semana se pide solo para atletas con plan activo.
  const weekQueries = useQueries({
    queries: rows
      .filter((r) => r.hasPlan && r.status !== "pending")
      .map((r) => ({
        queryKey: ["athletes", r.id, "week"],
        queryFn: () => trackingApi.getAthleteSummary(r.id, 1),
        staleTime: 60_000,
      })),
  });
  const weekByAthlete: Record<string, WeekProgress | null> = {};
  weekQueries.forEach((q) => {
    if (q.data) weekByAthlete[q.data.athlete.id] = currentWeek(q.data.weeks);
  });

  const hasAthletes = rows.length > 0;
  const loading = attentionQuery.isLoading;

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

      {!loading && !attentionQuery.isError && (
        <CoachHero
          attentionCount={groups.length}
          first={visible[0] ?? null}
          hasAthletes={hasAthletes || athletesQuery.isLoading}
        />
      )}
      {loading && <p>Cargando…</p>}

      <div className="hm-layout">
        <div className="hm-main">
          {applied && (
            <div className="success-banner" role="status">
              <strong>Ajuste aplicado.</strong> {applied}
            </div>
          )}
          {groups.length > 0 && <h2 className="section-title">Necesitan atención</h2>}
          {groups.map((group) => (
            <section key={group.athlete.id} className="hm-card hm-group">
              <div className="hm-group-head">
                <span className="hm-avatar" aria-hidden="true">
                  {initials(group.athlete.name)}
                </span>
                <h3 className="hm-group-name">{group.athlete.name}</h3>
                <Link className="button-ghost" to={`/athletes/${group.athlete.id}`}>
                  Ver resumen →
                </Link>
              </div>
              <AttentionList items={group.items} onDismiss={dismiss} onApplied={setApplied} />
            </section>
          ))}
        </div>

        <CoachAthletesPanel rows={rows} weekByAthlete={weekByAthlete} isLoading={athletesQuery.isLoading} />
      </div>
    </div>
  );
}
