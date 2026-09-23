import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus, SessionStatus } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as sessionsApi from "../services/sessionsApi";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/httpClient";
import { LoadingScreen } from "../components/LoadingScreen";

const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  pending: "Pendiente",
  completed: "Completada",
  skipped: "Salteada",
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

  const cycleQuery = useQuery({ queryKey: ["cycles", id], queryFn: () => cyclesApi.getCycle(id) });
  const sessionsQuery = useQuery({
    queryKey: ["cycles", id, "sessions"],
    queryFn: () => sessionsApi.listSessions(id),
  });

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

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);

  const createSessionMutation = useMutation({
    mutationFn: () =>
      sessionsApi.createSession(id, { name: sessionName, scheduledDate: sessionDate || undefined }),
    onSuccess: () => {
      setShowSessionForm(false);
      setSessionName("");
      setSessionDate("");
      queryClient.invalidateQueries({ queryKey: ["cycles", id, "sessions"] });
    },
    onError: (error: unknown) => {
      setSessionError(error instanceof ApiError ? error.message : "No se pudo crear la sesión.");
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

  function handleSessionSubmit(event: FormEvent) {
    event.preventDefault();
    setSessionError(null);
    createSessionMutation.mutate();
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
            {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)} · {CYCLE_STATUS_LABEL[cycle.status]}
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

      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Sesiones</h2>
        {isCoach && (
          <button
            type="button"
            className="button-secondary"
            style={{ width: "auto" }}
            onClick={() => setShowSessionForm((v) => !v)}
          >
            {showSessionForm ? "Cancelar" : "Agregar sesión"}
          </button>
        )}
      </div>

      {showSessionForm && (
        <form onSubmit={handleSessionSubmit} noValidate style={{ maxWidth: 360, marginTop: 16 }}>
          {sessionError && <div className="error-banner">{sessionError}</div>}

          <div className="field">
            <label htmlFor="sessionName">Nombre</label>
            <input
              id="sessionName"
              type="text"
              required
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="sessionDate">Fecha planificada (opcional)</label>
            <input
              id="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="button-primary"
            style={{ width: "auto" }}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? "Creando…" : "Agregar sesión"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {sessionsQuery.isLoading && <p>Cargando…</p>}
        {sessionsQuery.data && sessionsQuery.data.length === 0 && <p>Todavía no hay sesiones en este plan.</p>}

        {sessionsQuery.data && sessionsQuery.data.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {sessionsQuery.data.map((session) => (
              <li key={session.id} style={{ borderBottom: "1px solid var(--color-gray-border)" }}>
                <Link
                  to={`/sessions/${session.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 4px",
                    color: "var(--color-ink)",
                    textDecoration: "none",
                  }}
                >
                  <span>
                    <strong>{session.name}</strong>
                    {session.scheduledDate && (
                      <span style={{ color: "var(--color-ink-secondary)" }}> · {formatDate(session.scheduledDate)}</span>
                    )}
                  </span>
                  <span style={{ color: "var(--color-ink-secondary)" }}>
                    {SESSION_STATUS_LABEL[session.status]} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
