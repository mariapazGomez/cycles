import { FormEvent, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus, CycleType } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as athletesApi from "../services/athletesApi";
import { usePageBackground } from "../hooks/usePageBackground";
import { CyclePageSkeleton } from "../components/Skeleton";
import { CycleEditForm } from "../components/CycleEditForm";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/httpClient";
import { AthleteCycle } from "../components/AthleteCycle";
import { track } from "../lib/analytics";
import { libraryPath } from "../lib/library";

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

// Las fechas del ciclo se guardan a medianoche UTC: se leen en UTC para que un
// 21 de octubre no se vea como 20 en una zona al oeste de Greenwich.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export function CycleDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isCoach = user?.role === "coach";

  usePageBackground();
  const cycleQuery = useQuery({ queryKey: ["cycles", id], queryFn: () => cyclesApi.getCycle(id) });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes, enabled: isCoach });

  const [showEdit, setShowEdit] = useState(false);
  if (cycleQuery.isLoading) return <CyclePageSkeleton />;
  if (cycleQuery.isError || !cycleQuery.data) {
    return <div className="error-banner">No se pudo cargar este ciclo.</div>;
  }

  const cycle = cycleQuery.data;
  const athlete = isCoach
    ? (athletesQuery.data ?? []).map((r) => r.athlete).find((a) => a.id === cycle.athleteId) ?? null
    : null;

  // El atleta no arma nada: ve su ciclo semana a semana. Un macrociclo se queda
  // con la vista de siempre (docs/diseno/plan-del-atleta).
  if (!isCoach && cycle.cycleType !== "macrocycle") {
    return <AthleteCycle cycle={cycle} />;
  }

  // El calendario del coach vive en la ficha del atleta (docs/diseno/biblioteca).
  if (isCoach && cycle.cycleType !== "macrocycle" && cycle.athleteId) {
    return <Navigate to={`/athletes/${cycle.athleteId}?ciclo=${cycle.id}`} replace />;
  }

  return (
    <div className="pl-page">
      <Link className="rt-back" to={libraryPath("cycle")}>
        ← Biblioteca
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
            {showEdit ? "Cancelar" : "Editar ciclo"}
          </button>
        )}
      </div>

      {showEdit && <CycleEditForm cycle={cycle} onClose={() => setShowEdit(false)} />}

      {cycle.cycleType === "macrocycle" ? (
        <MacrocycleChildren cycleId={cycle.id} athleteId={cycle.athleteId} isCoach={isCoach} />
      ) : (
        <p className="hm-card pl-form">
          Este ciclo no tiene atleta. Asígnalo a uno desde la ficha del atleta para planificar sus días.
        </p>
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
      track("cycle_created", { type: cycleType, inMacrocycle: true });
      setShowForm(false);
      setName("");
      setSessionsPerWeek("");
      setStartDate("");
      setEndDate("");
      queryClient.invalidateQueries({ queryKey: ["cycles", cycleId, "children"] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo crear el ciclo.");
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
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Ciclos dentro de este macrociclo</h2>
        {isCoach && (
          <button
            type="button"
            className="button-secondary"
            style={{ width: "auto" }}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancelar" : "Agregar ciclo"}
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
            {createMutation.isPending ? "Creando…" : "Agregar ciclo"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {childrenQuery.data && childrenQuery.data.length === 0 && <p>Todavía no hay ciclos aquí.</p>}
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
