import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import * as routinesApi from "../services/routinesApi";
import * as trackingApi from "../services/trackingApi";
import { AttentionList, useDismissedAlerts } from "./AttentionList";
import { planWeekOf } from "../lib/format";
import { heroKind, planStats, totalWeeks } from "../lib/planGrid";
import { toLocalDay } from "../lib/calendar";
import { addDays, shortDate, weekdayName } from "../lib/weekCalendar";
import { PlanHero } from "./PlanHero";
import { PlanCalendar } from "./PlanCalendar";
import { CheckBadge } from "./CheckBadge";
import { PlanCalendarSkeleton, Skeleton } from "./Skeleton";
import { ApiError } from "../services/httpClient";
import { libraryPath } from "../lib/library";
import { track } from "../lib/analytics";

// Calendario del ciclo de un atleta, con un «+» en cada día para asignarle una
// rutina (docs/diseno/biblioteca). Las sesiones se ubican por fecha: un mismo
// día puede tener varias y «sesiones por semana» es solo una guía.
export function CycleCalendarView({
  cycle,
  athlete,
}: {
  cycle: TrainingCycle;
  athlete: { id: string; name: string } | null;
}) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["cycles", cycle.id, "sessions"],
    queryFn: () => sessionsApi.listSessions(cycle.id),
  });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });
  // Lo que el atleta registró en cada sesión (esfuerzo, minutos, dolor) y los
  // avisos de este plan.
  const progressQuery = useQuery({
    queryKey: ["cycles", cycle.id, "progress"],
    queryFn: () => trackingApi.getCycleProgress(cycle.id),
  });
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);
  // Al asignar la primera sesión del plan, un mensaje informativo dice que el
  // atleta ya puede entrenar. Se va solo.
  const [readyNotice, setReadyNotice] = useState(false);
  useEffect(() => {
    if (!readyNotice) return;
    const timer = window.setTimeout(() => setReadyNotice(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [readyNotice]);
  const planAlerts = (attentionQuery.data ?? []).filter(
    (item) => item.cycle.id === cycle.id && item.kind !== "low_adherence" && !isDismissed(item),
  );
  const progressById = new Map((progressQuery.data?.sessions ?? []).map((p) => [p.id, p]));
  const currentWeek = planWeekOf(cycle.startDate);

  const [assigningDay, setAssigningDay] = useState<string | null>(null);
  const [routineId, setRoutineId] = useState("");
  const [repeat, setRepeat] = useState(true);
  const [assignError, setAssignError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const weeks = totalWeeks(cycle.startDate, cycle.endDate);
  const slots = cycle.sessionsPerWeek ?? 0;
  const sessions = sessionsQuery.data ?? [];
  const stats = planStats(sessions, currentWeek);

  // El mismo día de las semanas que siguen y que aún no tienen sesión ese día.
  const repeatDays: string[] = [];
  if (assigningDay) {
    const lastDay = cycle.endDate.slice(0, 10);
    const taken = new Set(
      sessions.map((s) => (s.scheduledDate ? s.scheduledDate.slice(0, 10) : null)).filter(Boolean) as string[],
    );
    for (let day = addDays(assigningDay, 7); day <= lastDay; day = addDays(day, 7)) {
      if (!taken.has(day)) repeatDays.push(day);
    }
  }

  const assignMutation = useMutation({
    mutationFn: async (days: string[]) => {
      let done = 0;
      try {
        for (const day of days) {
          await sessionsApi.createSession(cycle.id, { routineId, scheduledDate: day });
          done += 1;
        }
      } catch (error) {
        const reason = error instanceof ApiError ? error.message : "No se pudo asignar la rutina.";
        throw new Error(done > 0 ? `Se asignaron ${done} de ${days.length} días. ${reason}` : reason);
      }
    },
    onSuccess: (_, days) => {
      track("routine_assigned", { weeks: days.length });
      setAssigningDay(null);
      setRoutineId("");
      if (sessions.length === 0) setReadyNotice(true);
    },
    onError: (error: unknown) => {
      setAssignError(error instanceof Error ? error.message : "No se pudo asignar la rutina.");
    },
    // Con éxito o con error parcial, el calendario se vuelve a leer.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["cycles", cycle.id, "sessions"] }),
  });

  function openAssign(dayIso: string) {
    setAssignError(null);
    setRoutineId("");
    setRepeat(true);
    setAssigningDay(dayIso);
    // El panel está arriba de las semanas: se lleva a la vista y el foco al selector.
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      document.getElementById("assignRoutine")?.focus();
    }, 0);
  }

  const kind = heroKind(stats, currentWeek, weeks);
  const assignLabel = assigningDay ? `${weekdayName(assigningDay)} ${shortDate(assigningDay)}` : "";
  const outOfCycle =
    assigningDay !== null &&
    (assigningDay < cycle.startDate.slice(0, 10) || assigningDay > cycle.endDate.slice(0, 10));

  return (
    <div className="pl-grid-area">
      {sessionsQuery.isLoading ? (
        <div className="cy-strip cy-sk-strip" aria-busy="true" aria-label="Cargando el avance del ciclo">
          <Skeleton width={150} height={24} />
          <Skeleton width={260} height={12} />
        </div>
      ) : kind === "ended" ? null : (
        <PlanHero
          kind={kind}
          stats={stats}
          weeks={weeks}
          currentWeek={currentWeek}
          startDate={cycle.startDate}
          isCoach
          athlete={athlete}
        />
      )}

      {readyNotice && (
        <div className="success-banner" role="status">
          <strong>{athlete ? `${athlete.name} ya puede entrenar.` : "Tu atleta ya puede entrenar."}</strong> Verá este
          ciclo en Hoy y le llegará un aviso en unos minutos.
        </div>
      )}
      {applied && (
        <div className="success-banner" role="status">
          <strong>Ajuste aplicado.</strong> {applied}
        </div>
      )}
      {planAlerts.length > 0 && (
        <section className="hm-card" style={{ marginBottom: 16 }}>
          <AttentionList
            items={planAlerts}
            onDismiss={dismiss}
            onApplied={(message) => {
              setApplied(message);
              queryClient.invalidateQueries({ queryKey: ["cycles", cycle.id, "progress"] });
            }}
          />
        </section>
      )}

      {routinesQuery.data && routinesQuery.data.length === 0 && (
        <p style={{ color: "var(--color-ink-secondary)" }}>
          Todavía no tienes rutinas. <Link to="/routines/new">Arma una primero</Link> para poder asignarla aquí.
          También puedes verlas en la <Link to={libraryPath("routine")}>Biblioteca</Link>.
        </p>
      )}

      {assigningDay && (
        <section className="hm-card pl-panel" ref={panelRef}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAssignError(null);
              if (!routineId) {
                setAssignError("Elige una rutina.");
                return;
              }
              if (outOfCycle) return;
              assignMutation.mutate(repeat ? [assigningDay, ...repeatDays] : [assigningDay]);
            }}
            noValidate
          >
            <h2>Asignar rutina el {assignLabel}</h2>
            {outOfCycle && (
              <div className="error-banner" role="alert">
                Ese día queda fuera de las fechas del ciclo.
              </div>
            )}
            {assignError && (
              <div className="error-banner" role="alert">
                {assignError}
              </div>
            )}
            <div className="field">
              <label htmlFor="assignRoutine">Rutina</label>
              <select id="assignRoutine" required value={routineId} onChange={(e) => setRoutineId(e.target.value)}>
                <option value="" disabled>
                  Elige una rutina
                </option>
                {(routinesQuery.data ?? []).map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name}
                  </option>
                ))}
              </select>
            </div>
            {repeatDays.length > 0 && (
              <label className="pl-check">
                <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
                <span>
                  Repetir este día en las semanas que siguen vacías ({repeatDays.length} más)
                </span>
              </label>
            )}
            <div className="pl-panel-actions">
              <button type="submit" className="button-primary" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? "Asignando…" : "Asignar"}
              </button>
              <button type="button" className="button-secondary" onClick={() => setAssigningDay(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="pl-section-head">
        <h2>Calendario del ciclo</h2>
        <span className="pc-legend" aria-hidden="true">
          <span>
            <CheckBadge small label="Hecha" /> Hecha
          </span>
          <span>
            <i className="pc-legend-swatch" /> Pendiente
          </span>
          <span>
            <i className="pc-legend-swatch pc-legend-skip" /> Omitida
          </span>
        </span>
      </div>

      {sessionsQuery.isLoading ? (
        <PlanCalendarSkeleton />
      ) : (
        <PlanCalendar
          startDate={cycle.startDate}
          weeks={weeks}
          slots={slots}
          currentWeek={currentWeek}
          todayIso={toLocalDay(new Date())}
          sessions={sessions}
          progressById={progressById}
          isCoach
          onAssign={openAssign}
          assigningDay={assigningDay}
        />
      )}
    </div>
  );
}
