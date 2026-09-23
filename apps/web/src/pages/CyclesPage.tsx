import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { useAuth } from "../hooks/useAuth";

const STATUS_LABEL: Record<CycleStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CyclesPage() {
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [athleteId, setAthleteId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const athletesQuery = useQuery({
    queryKey: ["athletes"],
    queryFn: athletesApi.listAthletes,
    enabled: isCoach,
  });
  const activeAthletes = (athletesQuery.data ?? []).filter((relation) => relation.status === "active");

  const createMutation = useMutation({
    mutationFn: cyclesApi.createCycle,
    onSuccess: () => {
      setShowForm(false);
      setAthleteId("");
      setName("");
      setObjective("");
      setStartDate("");
      setEndDate("");
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo crear el plan.");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate({
      athleteId,
      name,
      objective: objective || undefined,
      startDate,
      endDate,
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Planes</h1>
          <p style={{ color: "var(--color-ink-secondary)", marginTop: 0 }}>
            {isCoach
              ? "Ciclos de entrenamiento que armaste para tus atletas."
              : "Tus ciclos de entrenamiento asignados."}
          </p>
        </div>
        {isCoach && (
          <button
            type="button"
            className="button-primary"
            style={{ width: "auto" }}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancelar" : "Crear plan"}
          </button>
        )}
      </div>

      {isCoach && showForm && (
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420, marginTop: 24 }}>
          {formError && <div className="error-banner">{formError}</div>}

          <div className="field">
            <label htmlFor="cycleAthlete">Atleta</label>
            <select
              id="cycleAthlete"
              required
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
            >
              <option value="" disabled>
                Elegí un atleta
              </option>
              {activeAthletes.map((relation) => (
                <option key={relation.athlete.id} value={relation.athlete.id}>
                  {relation.athlete.name}
                </option>
              ))}
            </select>
            {activeAthletes.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--color-ink-secondary)" }}>
                Todavía no tenés atletas activos. <Link to="/athletes">Invitá uno primero</Link>.
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="cycleName">Nombre</label>
            <input
              id="cycleName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="cycleObjective">Objetivo (opcional)</label>
            <input
              id="cycleObjective"
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="cycleStart">Inicio</label>
              <input
                id="cycleStart"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="cycleEnd">Fin</label>
              <input
                id="cycleEnd"
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
            disabled={createMutation.isPending || activeAthletes.length === 0}
          >
            {createMutation.isPending ? "Creando…" : "Crear plan"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 32 }}>
        {cyclesQuery.isLoading && <p>Cargando…</p>}
        {cyclesQuery.isError && <div className="error-banner">No se pudo cargar la lista.</div>}
        {cyclesQuery.data && cyclesQuery.data.length === 0 && <p>Todavía no creaste ningún plan.</p>}

        {cyclesQuery.data && cyclesQuery.data.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cyclesQuery.data.map((cycle) => (
              <li key={cycle.id} style={{ borderBottom: "1px solid var(--color-gray-border)" }}>
                <Link
                  to={`/cycles/${cycle.id}`}
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
                    <strong>{cycle.name}</strong>{" "}
                    <span style={{ color: "var(--color-ink-secondary)" }}>
                      ({formatDate(cycle.startDate)} – {formatDate(cycle.endDate)})
                    </span>
                  </span>
                  <span style={{ color: "var(--color-ink-secondary)" }}>
                    {STATUS_LABEL[cycle.status]} →
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
