import { FormEvent, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus, CycleType } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as sessionsApi from "../services/sessionsApi";
import * as routinesApi from "../services/routinesApi";
import * as trackingApi from "../services/trackingApi";
import * as athletesApi from "../services/athletesApi";
import { AttentionList, useDismissedAlerts } from "../components/AttentionList";
import { planWeekOf } from "../lib/format";
import { cellKey, emptyWeeksFrom, heroKind, planStats, totalWeeks } from "../lib/planGrid";
import { usePageBackground } from "../hooks/usePageBackground";
import { PlanHero } from "../components/PlanHero";
import { PlanWeeks } from "../components/PlanWeeks";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/httpClient";
import { LoadingScreen } from "../components/LoadingScreen";

const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

const CYCLE_TYPE_LABEL: Record<CycleType, string> = {
  microcycle: "Microciclo",
  mesocycle: "Mesociclo",
  macrocycle: "Macrociclo",
};

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CycleDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const queryClient = useQueryClient();

  usePageBackground();
  const cycleQuery = useQuery({ queryKey: ["cycles", id], queryFn: () => cyclesApi.getCycle(id) });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes, enabled: isCoach });

  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const updateCycleMutation = useMutation({
    mutationFn: (data: Parameters<typeof cyclesApi.updateCycle>[1]) => cyclesApi.updateCycle(id, data),
    onSuccess: () => {
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: ["cycles", id] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
    },
    onError: (error: unknown) => {
      setEditError(error instanceof ApiError ? error.message : "No se pudo actualizar el plan.");
    },
  });

  if (cycleQuery.isLoading) return <LoadingScreen />;
  if (cycleQuery.isError || !cycleQuery.data) {
    return <div className="error-banner">No se pudo cargar este plan.</div>;
  }

  const cycle = cycleQuery.data;
  const athlete = isCoach
    ? (athletesQuery.data ?? []).map((r) => r.athlete).find((a) => a.id === cycle.athleteId) ?? null
    : null;

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);
    const form = new FormData(event.currentTarget);
    updateCycleMutation.mutate({
      name: String(form.get("name")),
      objective: String(form.get("objective") || "") || undefined,
      startDate: String(form.get("startDate")),
      endDate: String(form.get("endDate")),
      status: form.get("status") as CycleStatus,
    });
  }

  return (
    <div className="pl-page">
      <Link className="rt-back" to="/cycles">
        ← Planes
      </Link>

      <div className="page-header" style={{ marginTop: 8 }}>
        <div className="pl-title">
          <h1 className="page-title">{cycle.name}</h1>
          <div className="pl-chips">
            <span className={cycle.status === "active" ? "pill pill-blue" : "pill"}>{CYCLE_STATUS_LABEL[cycle.status]}</span>
            <span className="pill">{CYCLE_TYPE_LABEL[cycle.cycleType]}</span>
            <span className="pill">
              {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
            </span>
            {athlete && (
              <Link className="pl-who" to={`/athletes/${athlete.id}`}>
                <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                  {athlete.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("")}
                </span>
                {athlete.name}
              </Link>
            )}
          </div>
          {cycle.objective && <p className="pl-objective">{cycle.objective}</p>}
        </div>
        {isCoach && (
          <button type="button" className="button-secondary pl-edit" onClick={() => setShowEdit((v) => !v)}>
            {showEdit ? "Cancelar" : "Editar plan"}
          </button>
        )}
      </div>

      {showEdit && (
        <form onSubmit={handleEditSubmit} noValidate className="hm-card pl-form">
          {editError && <div className="error-banner">{editError}</div>}

          <div className="field">
            <label htmlFor="editName">Nombre</label>
            <input id="editName" name="name" type="text" required defaultValue={cycle.name} />
          </div>

          <div className="field">
            <label htmlFor="editObjective">Objetivo</label>
            <input id="editObjective" name="objective" type="text" defaultValue={cycle.objective ?? ""} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="editStart">Inicio</label>
              <input
                id="editStart"
                name="startDate"
                type="date"
                required
                defaultValue={toDateInput(cycle.startDate)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="editEnd">Fin</label>
              <input
                id="editEnd"
                name="endDate"
                type="date"
                required
                defaultValue={toDateInput(cycle.endDate)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="editStatus">Estado</label>
            <select id="editStatus" name="status" defaultValue={cycle.status}>
              {Object.entries(CYCLE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="button-primary"
            style={{ width: "auto" }}
            disabled={updateCycleMutation.isPending}
          >
            {updateCycleMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}

      {cycle.cycleType === "macrocycle" ? (
        <MacrocycleChildren cycleId={cycle.id} athleteId={cycle.athleteId} isCoach={isCoach} />
      ) : (
        <CycleGrid cycle={cycle} isCoach={isCoach} athlete={athlete} />
      )}
    </div>
  );
}

function MacrocycleChildren({
  cycleId,
  athleteId,
  isCoach,
}: {
  cycleId: string;
  athleteId: string;
  isCoach: boolean;
}) {
  const queryClient = useQueryClient();
  const childrenQuery = useQuery({
    queryKey: ["cycles", cycleId, "children"],
    queryFn: () => cyclesApi.getChildren(cycleId),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cycleType, setCycleType] = useState<Exclude<CycleType, "macrocycle">>("mesocycle");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      cyclesApi.createCycle({
        athleteId,
        parentCycleId: cycleId,
        name,
        cycleType,
        sessionsPerWeek: Number(sessionsPerWeek),
        startDate,
        endDate,
      }),
    onSuccess: () => {
      setShowForm(false);
      setName("");
      setSessionsPerWeek("");
      setStartDate("");
      setEndDate("");
      queryClient.invalidateQueries({ queryKey: ["cycles", cycleId, "children"] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo crear el plan.");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Planes dentro de este macrociclo</h2>
        {isCoach && (
          <button
            type="button"
            className="button-secondary"
            style={{ width: "auto" }}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancelar" : "Agregar plan"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420, marginTop: 16 }}>
          {formError && <div className="error-banner">{formError}</div>}

          <div className="field">
            <label htmlFor="childType">Tipo</label>
            <select
              id="childType"
              value={cycleType}
              onChange={(e) => setCycleType(e.target.value as Exclude<CycleType, "macrocycle">)}
            >
              <option value="mesocycle">Mesociclo</option>
              <option value="microcycle">Microciclo</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="childSessionsPerWeek">Sesiones por semana</label>
            <input
              id="childSessionsPerWeek"
              type="number"
              min={1}
              required
              value={sessionsPerWeek}
              onChange={(e) => setSessionsPerWeek(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="childName">Nombre</label>
            <input
              id="childName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="childStart">Inicio</label>
              <input
                id="childStart"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="childEnd">Fin</label>
              <input
                id="childEnd"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="button-primary"
            style={{ width: "auto" }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creando…" : "Agregar plan"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {childrenQuery.data && childrenQuery.data.length === 0 && <p>Todavía no hay planes aquí.</p>}
        {childrenQuery.data && childrenQuery.data.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {childrenQuery.data.map((child) => (
              <li key={child.id} style={{ borderBottom: "1px solid var(--color-gray-border)" }}>
                <Link
                  to={`/cycles/${child.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 4px",
                    color: "var(--color-ink)",
                    textDecoration: "none",
                  }}
                >
                  <span>
                    <strong>{child.name}</strong>{" "}
                    <span style={{ color: "var(--color-ink-secondary)" }}>
                      ({CYCLE_TYPE_LABEL[child.cycleType]})
                    </span>
                  </span>
                  <span style={{ color: "var(--color-ink-secondary)" }}>→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CycleGrid({
  cycle,
  isCoach,
  athlete,
}: {
  cycle: Awaited<ReturnType<typeof cyclesApi.getCycle>>;
  isCoach: boolean;
  athlete: { id: string; name: string } | null;
}) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["cycles", cycle.id, "sessions"],
    queryFn: () => sessionsApi.listSessions(cycle.id),
  });
  const routinesQuery = useQuery({
    queryKey: ["routines"],
    queryFn: routinesApi.listRoutines,
    enabled: isCoach,
  });
  // Lo que el atleta registró en cada celda (esfuerzo, minutos, dolor) y los
  // avisos de este plan. Solo el coach los ve.
  const progressQuery = useQuery({
    queryKey: ["cycles", cycle.id, "progress"],
    queryFn: () => trackingApi.getCycleProgress(cycle.id),
    enabled: isCoach,
  });
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention, enabled: isCoach });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);
  const planAlerts = (attentionQuery.data ?? []).filter(
    (item) => item.cycle.id === cycle.id && item.kind !== "low_adherence" && !isDismissed(item),
  );
  const progressById = new Map((progressQuery.data?.sessions ?? []).map((p) => [p.id, p]));
  const currentWeek = planWeekOf(cycle.startDate);

  const [assigningCell, setAssigningCell] = useState<{ week: number; slot: number } | null>(null);
  const [routineId, setRoutineId] = useState("");
  const [repeat, setRepeat] = useState(true);
  const [assignError, setAssignError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const weeks = totalWeeks(cycle.startDate, cycle.endDate);
  const slots = cycle.sessionsPerWeek ?? 0;
  const sessions = sessionsQuery.data ?? [];
  const sessionByCell = new Map(sessions.map((session) => [cellKey(session.weekNumber, session.slotNumber), session]));
  const stats = planStats(sessions, currentWeek);

  // Semanas, desde la elegida, en que esa sesión sigue sin rutina.
  const emptyWeeks = assigningCell
    ? emptyWeeksFrom(new Set(sessionByCell.keys()), assigningCell.week, assigningCell.slot, weeks)
    : [];

  const assignMutation = useMutation({
    mutationFn: async (targetWeeks: number[]) => {
      if (!assigningCell) throw new Error("sin celda");
      let done = 0;
      try {
        for (const weekNumber of targetWeeks) {
          await sessionsApi.createSession(cycle.id, { weekNumber, slotNumber: assigningCell.slot, routineId });
          done += 1;
        }
      } catch (error) {
        const reason = error instanceof ApiError ? error.message : "No se pudo asignar la rutina.";
        throw new Error(done > 0 ? `Se asignaron ${done} de ${targetWeeks.length} semanas. ${reason}` : reason);
      }
    },
    onSuccess: () => {
      setAssigningCell(null);
      setRoutineId("");
    },
    onError: (error: unknown) => {
      setAssignError(error instanceof Error ? error.message : "No se pudo asignar la rutina.");
    },
    // Con éxito o con error parcial, la grilla se vuelve a leer.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["cycles", cycle.id, "sessions"] }),
  });

  function openAssign(week: number, slot: number) {
    setAssignError(null);
    setRoutineId("");
    setRepeat(true);
    setAssigningCell({ week, slot });
    // El panel está arriba de las semanas: se lleva a la vista y el foco al selector.
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      document.getElementById("assignRoutine")?.focus();
    }, 0);
  }

  return (
    <div className="pl-grid-area">
      <PlanHero
        kind={heroKind(stats, currentWeek, weeks)}
        stats={stats}
        weeks={weeks}
        currentWeek={currentWeek}
        startDate={cycle.startDate}
        isCoach={isCoach}
        athlete={athlete}
      />

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

      {isCoach && routinesQuery.data && routinesQuery.data.length === 0 && (
        <p style={{ color: "var(--color-ink-secondary)" }}>
          Todavía no tienes rutinas. <Link to="/routines">Arma una primero</Link> para poder asignarla aquí.
        </p>
      )}

      {assigningCell && (
        <section className="hm-card pl-panel" ref={panelRef}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAssignError(null);
              if (!routineId) {
                setAssignError("Elige una rutina.");
                return;
              }
              assignMutation.mutate(repeat ? emptyWeeks : [assigningCell.week]);
            }}
            noValidate
          >
            <h2>
              Asignar rutina a la semana {assigningCell.week}, sesión {assigningCell.slot}
            </h2>
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
            {emptyWeeks.length > 1 && (
              <label className="pl-check">
                <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
                <span>
                  Repetir en las semanas que siguen vacías ({emptyWeeks.length - 1} más)
                </span>
              </label>
            )}
            <div className="pl-panel-actions">
              <button type="submit" className="button-primary" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? "Asignando…" : "Asignar"}
              </button>
              <button type="button" className="button-secondary" onClick={() => setAssigningCell(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="pl-section-head">
        <h2>Semanas del plan</h2>
        {stats.assigned > 0 && <span className="pl-hint">Toca una sesión para verla</span>}
      </div>

      {sessionsQuery.isLoading ? (
        <p>Cargando…</p>
      ) : (
        <PlanWeeks
          weeks={weeks}
          slots={slots}
          currentWeek={currentWeek}
          sessionByCell={sessionByCell}
          progressById={progressById}
          isCoach={isCoach}
          onAssign={openAssign}
        />
      )}
    </div>
  );
}
