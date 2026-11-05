import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as trackingApi from "../../services/trackingApi";
import * as cyclesApi from "../../services/cyclesApi";
import * as layoutApi from "../../services/summaryLayoutApi";
import type { BoardToast, SaveStatus } from "../../hooks/useBoardActions";
import { SaveIndicator } from "../board/SaveIndicator";
import { UndoToast } from "../board/UndoToast";
import { toLocalDay } from "../../lib/calendar";
import { currentCycle } from "../../lib/cycleSections";
import { formatInteger, formatNumber, formatShortDate } from "../../lib/format";
import { lastSessionPhrase } from "../../lib/starChart";
import {
  DEFAULT_LAYOUT, PERIOD_LABEL, SYSTEM_TITLES, hiddenCharts, hideChart, moveChart, moveChartBefore, resetLayout, resizeChart, showChart, boardSessions, boardStats, boardWeeks, chartTitle, chooseCycles, defaultExercise,
  effortPoints, exerciseOptions, repsPoints, rirBars, visibleCharts, weightMode, weightPoints,
  type BoardSession, type ChartDef, type ChartSize, type CycleEntry, type LayoutChange, type Period,
} from "../../lib/summaryBoard";
import { AdherenceChart, AdherenceLegend, WeeklyLoadChart } from "../charts";
import { StarChart } from "../StarChart";
import { Skeleton } from "../Skeleton";
import { EffortChart, RirChart, WithTable } from "./SummaryCharts";

// Pizarra de gráficos del Resumen del atleta, en la ficha del coach (CYC-240,
// diseño docs/diseno/resumen-atleta): cifras, filtro de periodo y los cinco
// gráficos del sistema en el orden que el coach guardó (CYC-238).

const PERIODS: Period[] = ["cycle", "four", "all"];

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatNumber(Math.abs(n))}`;
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="sb-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function ChartCard({ def, children, full }: { def: ChartDef; children: React.ReactNode; full?: boolean }) {
  return (
    <section className={full || def.tamano === "completo" ? "sb-card sb-full" : "sb-card"} aria-labelledby={`sb-${def.id}`} data-chart={def.id}>
      <h2 className="section-title" id={`sb-${def.id}`}>
        {chartTitle(def)}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="sb-empty">{children}</p>;
}

function PlanReal({ sessions }: { sessions: BoardSession[] }) {
  const options = useMemo(() => exerciseOptions(sessions), [sessions]);
  const [picked, setPicked] = useState<string | null>(null);
  const id = picked && options.some((o) => o.id === picked) ? picked : defaultExercise(options);
  if (!id) return <Empty>Aún no hay series registradas de ningún ejercicio.</Empty>;
  const name = options.find((o) => o.id === id)?.name ?? "";
  const weights = weightPoints(sessions, id);
  const reps = repsPoints(sessions, id);
  const mode = weightMode(weights);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="sb-chips" role="group" aria-label="Ejercicio">
        {options.map((o) => (
          <button key={o.id} type="button" className="cb-chip" aria-pressed={o.id === id} onClick={() => setPicked(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
      {weights.length < 2 && <p className="sb-note">Con una segunda sesión verás la tendencia.</p>}
      <div className="sb-pair">
        {mode === "bodyweight" ? (
          <Empty>Sin peso planificado. Mira las repeticiones.</Empty>
        ) : (
          <div>
            {mode === "no-plan" && <p className="sb-note">Sin plan de peso</p>}
            <StarChart title={name} points={weights} unit="kg" />
          </div>
        )}
        <StarChart title={`${name}: repeticiones`} points={reps} unit="reps" />
      </div>
      <WithTable
        label={`Peso y repeticiones de ${name}`}
        headers={["Sesión", "Fecha", "Peso plan (kg)", "Peso cargado (kg)", "Reps plan", "Reps hechas"]}
        rows={weights.map((p, i) => [p.label, formatShortDate(p.date), p.planned ?? "—", p.actual ?? "—", reps[i]?.planned ?? "—", reps[i]?.actual ?? "—"])}
      >
        <span className="at-sr">{lastSessionPhrase(weights)}</span>
      </WithTable>
    </div>
  );
}

export function SummaryBoard({ athleteId }: { athleteId: string }) {
  const [period, setPeriod] = useState<Period>("cycle");
  const today = toLocalDay(new Date());

  const summaryQuery = useQuery({
    queryKey: ["athletes", athleteId, "summary", "board"],
    queryFn: () => trackingApi.getAthleteSummary(athleteId, 26),
  });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const layoutQuery = useQuery({ queryKey: ["coach", "summary-layout"], queryFn: layoutApi.getSummaryLayout });
  const queryClient = useQueryClient();

  // Modo «Organizar»: cada cambio se guarda solo y se puede deshacer durante 7 s.
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<ChartDef[] | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [toast, setToast] = useState<BoardToast | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const timers = useRef<{ toast?: number; saved?: number }>({});
  useEffect(() => () => {
    window.clearTimeout(timers.current.toast);
    window.clearTimeout(timers.current.saved);
  }, []);
  const saveLayout = useMutation({
    mutationFn: layoutApi.saveSummaryLayout,
    onSuccess: (saved) => {
      queryClient.setQueryData(["coach", "summary-layout"], saved);
      setStatus("saved");
      window.clearTimeout(timers.current.saved);
      timers.current.saved = window.setTimeout(() => setStatus("idle"), 2500);
    },
    onError: () => setStatus("error"),
  });

  const own = useMemo(() => (cyclesQuery.data ?? []).filter((c) => c.athleteId === athleteId), [cyclesQuery.data, athleteId]);
  const chosen = useMemo(() => chooseCycles(own, period, today), [own, period, today]);
  const current = useMemo(() => currentCycle(own.filter((c) => !c.isTemplate && c.cycleType !== "macrocycle"), today), [own, today]);
  const progressQueries = useQueries({
    queries: chosen.map((c) => ({ queryKey: ["cycles", c.id, "progress"], queryFn: () => trackingApi.getCycleProgress(c.id) })),
  });

  const loading = cyclesQuery.isLoading || progressQueries.some((q) => q.isLoading);
  const failed = cyclesQuery.isError || progressQueries.some((q) => q.isError);
  const entries: CycleEntry[] = chosen.flatMap((cycle, i) => {
    const progress = progressQueries[i]?.data;
    return progress ? [{ cycle, progress }] : [];
  });
  const sessions = useMemo(() => boardSessions(entries, period, today), [entries, period, today]);
  const stats = boardStats(sessions);
  const weeks = boardWeeks(summaryQuery.data?.weeks ?? [], period, period === "cycle" ? chosen[0] ?? null : current);
  const layoutDefs = local ?? layoutQuery.data?.charts ?? DEFAULT_LAYOUT;
  const layout = visibleCharts(layoutDefs);
  const hidden = hiddenCharts(layoutDefs);

  function persist(next: ChartDef[]) {
    setLocal(next);
    setStatus("saving");
    saveLayout.mutate(next);
  }
  function apply(change: LayoutChange | null) {
    if (!change) return;
    const before = layoutDefs;
    persist(change.layout);
    setToast({ message: change.message, undo: () => persist(before) });
    window.clearTimeout(timers.current.toast);
    timers.current.toast = window.setTimeout(() => setToast(null), 7000);
  }

  const weeksTotal = current ? Math.ceil((Date.parse(current.endDate.slice(0, 10)) - Date.parse(current.startDate.slice(0, 10))) / 86_400_000 / 7 + 1 / 7) : null;
  const currentWeek = current ? Math.max(1, Math.min(weeksTotal ?? 1, Math.floor((Date.parse(today) - Date.parse(current.startDate.slice(0, 10))) / 86_400_000 / 7) + 1)) : null;
  const registered = weeks.reduce((n, w) => n + w.completed + w.skipped, 0);
  const assigned = weeks.reduce((n, w) => n + w.assigned, 0);
  const noData = !loading && !failed && sessions.every((s) => s.status === "pending");

  function renderEditing(def: ChartDef, index: number) {
    const title = chartTitle(def);
    const full = def.tamano === "completo";
    return (
      <section
        key={def.id}
        className={`sb-card sb-edit${full ? " sb-full" : ""}${overId === def.id && dragId !== def.id ? " sb-drop" : ""}`}
        aria-label={title}
        data-chart={def.id}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          setOverId(def.id);
        }}
        onDragLeave={() => setOverId((cur) => (cur === def.id ? null : cur))}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId) apply(moveChartBefore(layoutDefs, dragId, def.id));
          setDragId(null);
          setOverId(null);
        }}
      >
        <div className="sb-edit-bar">
          <span
            className="sb-handle"
            draggable
            aria-hidden="true"
            title="Arrastra para mover"
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", def.id);
              setDragId(def.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          >
            ⠿
          </span>
          <strong className="sb-edit-title">{title}</strong>
          <div className="sb-edit-actions">
            <button type="button" className="cb-chip" aria-label={`Mover «${title}» antes`} disabled={index === 0} onClick={() => apply(moveChart(layoutDefs, def.id, "before"))}>
              ↑ Antes
            </button>
            <button type="button" className="cb-chip" aria-label={`Mover «${title}» después`} disabled={index === layout.length - 1} onClick={() => apply(moveChart(layoutDefs, def.id, "after"))}>
              ↓ Después
            </button>
            <span className="sb-size" role="group" aria-label={`Tamaño de «${title}»`}>
              {(["mitad", "completo"] as ChartSize[]).map((size) => (
                <button key={size} type="button" className="cb-chip" aria-pressed={def.tamano === size} onClick={() => apply(resizeChart(layoutDefs, def.id, size))}>
                  {size === "mitad" ? "Mitad" : "Completo"}
                </button>
              ))}
            </span>
            <button type="button" className="cb-chip" aria-label={`Quitar «${title}»`} onClick={() => apply(hideChart(layoutDefs, def.id))}>
              Quitar
            </button>
          </div>
        </div>
        <div className="sb-mini" aria-hidden="true">
          {full ? "Fila entera" : "Media fila"}
        </div>
      </section>
    );
  }

  function render(def: ChartDef) {
    const needsProgress = def.id === "plan-real" || def.id === "esfuerzo" || def.id === "costo-ejercicio";
    if (needsProgress && loading) return <ChartCard key={def.id} def={def}><Skeleton height={180} /></ChartCard>;
    if (needsProgress && failed) {
      return (
        <ChartCard key={def.id} def={def}>
          <div className="error-banner" role="alert">
            No se pudo cargar este gráfico.{" "}
            <button type="button" className="tour-link" onClick={() => progressQueries.forEach((q) => void q.refetch())}>
              Reintentar
            </button>
          </div>
        </ChartCard>
      );
    }
    if ((def.id === "progreso-ciclo" || def.id === "constancia") && summaryQuery.isLoading) return <ChartCard key={def.id} def={def}><Skeleton height={180} /></ChartCard>;
    if ((def.id === "progreso-ciclo" || def.id === "constancia") && summaryQuery.isError) {
      return (
        <ChartCard key={def.id} def={def}>
          <div className="error-banner" role="alert">
            No se pudo cargar este gráfico.{" "}
            <button type="button" className="tour-link" onClick={() => void summaryQuery.refetch()}>
              Reintentar
            </button>
          </div>
        </ChartCard>
      );
    }
    switch (def.id) {
      case "plan-real":
        return <ChartCard key={def.id} def={def}><PlanReal sessions={sessions} /></ChartCard>;
      case "progreso-ciclo":
        return (
          <ChartCard key={def.id} def={def}>
            {weeks.length === 0 ? (
              <Empty>Aún no hay semanas en este periodo.</Empty>
            ) : (
              <WithTable label="Carga por semana" headers={["Semana del", "Carga"]} rows={weeks.map((w) => [formatShortDate(w.weekStart), formatInteger(w.load)])}>
                <WeeklyLoadChart weeks={weeks} />
              </WithTable>
            )}
          </ChartCard>
        );
      case "constancia":
        return (
          <ChartCard key={def.id} def={def}>
            {weeks.length === 0 ? (
              <Empty>Aún no hay semanas en este periodo.</Empty>
            ) : (
              <>
                <strong>
                  {registered} de {assigned} registradas
                </strong>
                <AdherenceLegend />
                <WithTable
                  label="Sesiones por semana"
                  headers={["Semana del", "Hechas", "Omitidas", "Pendientes"]}
                  rows={weeks.map((w) => [formatShortDate(w.weekStart), w.completed, w.skipped, Math.max(0, w.assigned - w.completed - w.skipped)])}
                >
                  <AdherenceChart weeks={weeks} />
                </WithTable>
              </>
            )}
          </ChartCard>
        );
      case "esfuerzo": {
        const points = effortPoints(sessions);
        return (
          <ChartCard key={def.id} def={def}>
            {points.every((p) => p.value === null) ? (
              <Empty>Aún no hay esfuerzo reportado.</Empty>
            ) : (
              <WithTable label="Esfuerzo de cada sesión" headers={["Sesión", "Fecha", "Esfuerzo (0 a 10)"]} rows={points.map((p) => [p.label, formatShortDate(p.date), p.value === null ? (p.status === "skipped" ? "Omitida" : "—") : formatNumber(p.value)])}>
                <EffortChart points={points} />
              </WithTable>
            )}
          </ChartCard>
        );
      }
      case "costo-ejercicio": {
        const bars = rirBars(sessions);
        return (
          <ChartCard key={def.id} def={def}>
            {bars.length === 0 ? (
              <Empty>Aún no hay reps en reserva reportadas.</Empty>
            ) : (
              <WithTable label="Desvío de reps en reserva" headers={["Ejercicio", "Desvío (plan − reportado)"]} rows={bars.map((b) => [b.name, signed(b.deviation)])}>
                <RirChart bars={bars} />
              </WithTable>
            )}
          </ChartCard>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="sb-toolbar">
        <div className="sb-period" role="group" aria-label="Periodo">
          {PERIODS.map((p) => (
            <button key={p} type="button" className="cb-chip" aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="sb-organize">
          {editing && <SaveIndicator status={status} />}
          {editing && status === "error" && (
            <button type="button" className="tour-link" onClick={() => persist(layoutDefs)}>
              Reintentar
            </button>
          )}
          {editing && (
            <button type="button" className="cb-chip" onClick={() => apply(resetLayout(layoutDefs))}>
              Restablecer disposición
            </button>
          )}
          <button type="button" className={editing ? "cb-chip sb-done" : "cb-chip"} aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            {editing ? "Listo" : "Organizar"}
          </button>
        </div>
      </div>

      <dl className="sb-stats">
        <Stat label="Semana del ciclo" value={currentWeek && weeksTotal ? `${currentWeek} de ${weeksTotal}` : "—"} />
        <Stat label="Sesiones hechas" value={loading ? "…" : `${stats.sessionsDone} de ${stats.sessionsTotal}`} />
        <Stat
          label="Constancia"
          value={loading || stats.consistency === null ? "—" : `${Math.round(stats.consistency * 100)} %`}
          detail={stats.consistency === null ? undefined : `${stats.sessionsDone} de ${stats.consistencyOf} pasadas`}
        />
        <Stat label="Esfuerzo promedio" value={loading || stats.avgEffort === null ? "—" : `${formatNumber(stats.avgEffort)} de 10`} />
        <Stat label="Peso real contra el plan" value={loading || stats.weightDelta === null ? "—" : `${signed(Math.round(stats.weightDelta * 10) / 10)} kg`} />
      </dl>

      {editing ? (
        <>
          <div className="sb-board">{layout.map(renderEditing)}</div>
          <section className="sb-tray" aria-label="Gráficos ocultos">
            <h2 className="section-title">Gráficos ocultos</h2>
            {hidden.length === 0 ? (
              <p className="sb-note">No hay gráficos ocultos.</p>
            ) : (
              <ul>
                {hidden.map((c) => (
                  <li key={c.id}>
                    <span>{SYSTEM_TITLES[c.id]}</span>
                    <button type="button" className="cb-chip" aria-label={`Mostrar «${SYSTEM_TITLES[c.id]}»`} onClick={() => apply(showChart(layoutDefs, c.id))}>
                      Mostrar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : noData ? (
        <div className="sb-card">
          <p className="sb-empty">Aún no hay registros que resumir. Cuando el atleta complete su primera sesión, aquí verás su progreso.</p>
        </div>
      ) : (
        <div className="sb-board">{layout.map(render)}</div>
      )}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
