import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus, CycleType } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as sessionsApi from "../services/sessionsApi";
import * as routinesApi from "../services/routinesApi";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/httpClient";
import { LoadingScreen } from "../components/LoadingScreen";

const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  draft: "Borrador",
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

function totalWeeks(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

export function CycleDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const queryClient = useQueryClient();

  const cycleQuery = useQuery({ queryKey: ["cycles", id], queryFn: () => cyclesApi.getCycle(id) });

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
    <div>
      <p style={{ marginBottom: 4 }}>
        <Link to="/cycles" style={{ color: "var(--color-ink-secondary)", fontSize: "0.85rem" }}>
          ← Planes
        </Link>
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>{cycle.name}</h1>
          {cycle.objective && (
            <p style={{ color: "var(--color-ink-secondary)", marginTop: 0 }}>{cycle.objective}</p>
          )}
          <p style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem" }}>
            {CYCLE_TYPE_LABEL[cycle.cycleType]} · {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}{" "}
            · {CYCLE_STATUS_LABEL[cycle.status]}
          </p>
        </div>
        {isCoach && (
          <button
            type="button"
            className="button-secondary"
            style={{ width: "auto" }}
            onClick={() => setShowEdit((v) => !v)}
          >
            {showEdit ? "Cancelar" : "Editar plan"}
          </button>
        )}
      </div>

      {showEdit && (
        <form onSubmit={handleEditSubmit} noValidate style={{ maxWidth: 420, marginTop: 20 }}>
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
        <CycleGrid cycle={cycle} isCoach={isCoach} />
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
        {childrenQuery.data && childrenQuery.data.length === 0 && <p>Todavía no hay planes acá.</p>}
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
}: {
  cycle: Awaited<ReturnType<typeof cyclesApi.getCycle>>;
  isCoach: boolean;
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

  const [assigningCell, setAssigningCell] = useState<{ week: number; slot: number } | null>(null);
  const [routineId, setRoutineId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!assigningCell) return Promise.reject(new Error("sin celda"));
      return sessionsApi.createSession(cycle.id, {
        weekNumber: assigningCell.week,
        slotNumber: assigningCell.slot,
        routineId,
      });
    },
    onSuccess: () => {
      setAssigningCell(null);
      setRoutineId("");
      queryClient.invalidateQueries({ queryKey: ["cycles", cycle.id, "sessions"] });
    },
    onError: (error: unknown) => {
      setAssignError(error instanceof ApiError ? error.message : "No se pudo asignar la rutina.");
    },
  });

  const weeks = totalWeeks(cycle.startDate, cycle.endDate);
  const slots = cycle.sessionsPerWeek ?? 0;
  const sessionByCell = new Map(
    (sessionsQuery.data ?? []).map((session) => [`${session.weekNumber}-${session.slotNumber}`, session]),
  );

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: "1.1rem" }}>Grid del plan</h2>

      {isCoach && routinesQuery.data && routinesQuery.data.length === 0 && (
        <p style={{ color: "var(--color-ink-secondary)" }}>
          Todavía no tenés rutinas. <Link to="/routines">Armá una primero</Link> para poder asignarla acá.
        </p>
      )}

      {assigningCell && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAssignError(null);
            assignMutation.mutate();
          }}
          noValidate
          style={{ maxWidth: 360, margin: "16px 0", padding: 16, border: "1px solid var(--color-gray-border)", borderRadius: 8 }}
        >
          <p style={{ marginTop: 0, fontWeight: 600 }}>
            Semana {assigningCell.week} · Sesión {assigningCell.slot}
          </p>
          {assignError && <div className="error-banner">{assignError}</div>}
          <div className="field">
            <label htmlFor="assignRoutine">Rutina</label>
            <select
              id="assignRoutine"
              required
              value={routineId}
              onChange={(e) => setRoutineId(e.target.value)}
            >
              <option value="" disabled>
                Elegí una rutina
              </option>
              {(routinesQuery.data ?? []).map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="button-primary" style={{ width: "auto" }} disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Asignando…" : "Asignar"}
            </button>
            <button
              type="button"
              className="button-secondary"
              style={{ width: "auto" }}
              onClick={() => setAssigningCell(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}></th>
              {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
                <th
                  key={week}
                  style={{ padding: 8, fontSize: "0.82rem", color: "var(--color-ink-secondary)" }}
                >
                  Semana {week}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: slots }, (_, i) => i + 1).map((slot) => (
              <tr key={slot}>
                <td style={{ padding: 8, fontSize: "0.82rem", color: "var(--color-ink-secondary)", whiteSpace: "nowrap" }}>
                  Sesión {slot}
                </td>
                {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => {
                  const session = sessionByCell.get(`${week}-${slot}`);
                  return (
                    <td key={week} style={{ padding: 4, minWidth: 140 }}>
                      {session ? (
                        <Link
                          to={`/sessions/${session.id}`}
                          style={{
                            display: "block",
                            padding: "8px 10px",
                            border: "1px solid var(--color-gray-border)",
                            borderRadius: 8,
                            color: "var(--color-ink)",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                          }}
                        >
                          {session.name}
                        </Link>
                      ) : isCoach ? (
                        <button
                          type="button"
                          className="button-secondary"
                          style={{ width: "100%", padding: "8px 10px", fontSize: "0.8rem" }}
                          onClick={() => {
                            setAssignError(null);
                            setRoutineId("");
                            setAssigningCell({ week, slot });
                          }}
                        >
                          + Asignar
                        </button>
                      ) : (
                        <span
                          style={{
                            display: "block",
                            padding: "8px 10px",
                            fontSize: "0.8rem",
                            color: "var(--color-gray-mid)",
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
