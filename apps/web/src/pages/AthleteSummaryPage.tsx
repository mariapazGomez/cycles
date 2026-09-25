import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as trackingApi from "../services/trackingApi";
import { ApiError } from "../services/httpClient";
import { AttentionList, useDismissedAlerts } from "../components/AttentionList";
import { AdherenceChart, AdherenceLegend, Sparkline, WeeklyLoadChart } from "../components/charts";
import { LoadingScreen } from "../components/LoadingScreen";
import { formatKg, formatNumber, formatRir } from "../lib/format";

type Exercise = trackingApi.AthleteSummary["exercises"][number];

// Desvío promedio = RIR objetivo − RIR reportado: positivo = más duro de lo planificado.
function effortPill(exercise: Exercise) {
  if (exercise.lastTargetRir === null || exercise.avgRirDeviation === null) {
    return <span className="pill">Sin objetivo</span>;
  }
  if (exercise.avgRirDeviation >= 1) return <span className="pill pill-warn">Más duro de lo planificado</span>;
  if (exercise.avgRirDeviation <= -2) return <span className="pill pill-blue">Más fácil de lo planificado</span>;
  return <span className="pill">En objetivo</span>;
}

export function AthleteSummaryPage() {
  const { athleteId = "" } = useParams();
  const summaryQuery = useQuery({
    queryKey: ["athletes", athleteId, "summary"],
    queryFn: () => trackingApi.getAthleteSummary(athleteId),
  });
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);

  if (summaryQuery.isLoading) return <LoadingScreen />;
  if (summaryQuery.isError || !summaryQuery.data) {
    const message =
      summaryQuery.error instanceof ApiError ? summaryQuery.error.message : "No se pudo cargar el resumen.";
    return <div className="error-banner">{message}</div>;
  }

  const summary = summaryQuery.data;
  const alerts = (attentionQuery.data ?? []).filter(
    (item) => item.athlete.id === athleteId && !isDismissed(item),
  );
  const registered = summary.weeks.reduce((n, w) => n + w.completed + w.skipped, 0);
  const assigned = summary.weeks.reduce((n, w) => n + w.assigned, 0);

  return (
    <div className="stack">
      <div>
        <Link className="page-back" to="/athletes">
          ← Atletas
        </Link>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">{summary.athlete.name}</h1>
        </div>
      </div>

      {applied && (
        <div className="success-banner" role="status">
          <strong>Ajuste aplicado.</strong> {applied}
        </div>
      )}
      {alerts.length > 0 && (
        <section className="card">
          <AttentionList items={alerts} onDismiss={dismiss} onApplied={setApplied} />
        </section>
      )}

      <div className="chart-grid">
        <section className="chart-card">
          <h2 className="section-title">Carga semanal</h2>
          <WeeklyLoadChart weeks={summary.weeks} />
        </section>
        <section className="chart-card">
          <div className="card-header" style={{ padding: 0 }}>
            <h2 className="section-title">Adherencia</h2>
            <strong>
              {registered} de {assigned} registradas
            </strong>
          </div>
          <AdherenceLegend />
          <AdherenceChart weeks={summary.weeks} />
        </section>
      </div>

      <section className="stack" style={{ gap: 12 }}>
        <h2 className="section-title">Ejercicios</h2>
        {summary.exercises.length === 0 ? (
          <p>Todavía no hay sesiones completadas con registro de series.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th>Reps en reserva objetivo</th>
                  <th>Última reportada</th>
                  <th>Fuerza estimada</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {summary.exercises.map((exercise) => {
                  const values = exercise.e1rm.map((p) => p.value);
                  const last = values[values.length - 1];
                  return (
                    <tr key={exercise.exerciseId}>
                      <td style={{ fontWeight: 600 }}>{exercise.name}</td>
                      <td>{formatRir(exercise.lastTargetRir)}</td>
                      <td>
                        <span className="rir-chip">{formatRir(exercise.lastRir)}</span>
                      </td>
                      <td>
                        {values.length > 0 ? (
                          <span className="row" style={{ gap: 12 }}>
                            <Sparkline values={values} label={`Fuerza estimada de ${exercise.name} por semana`} />
                            <strong>{formatKg(last)}</strong>
                            {values.length > 1 && (
                              <span style={{ color: "var(--color-ink-secondary)" }}>
                                {last - values[0] >= 0 ? "+" : "−"}
                                {formatNumber(Math.abs(last - values[0]))} kg
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{effortPill(exercise)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
