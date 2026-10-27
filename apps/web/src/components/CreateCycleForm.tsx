import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CycleType } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { track } from "../lib/analytics";
import { CYCLE_TYPE_LABEL } from "../lib/library";

interface CreateCycleFormProps {
  onDone: () => void;
}

// Formulario para crear un ciclo. Antes vivía en la pestaña Ciclos; ahora se
// abre desde la Biblioteca.
export function CreateCycleForm({ onDone }: CreateCycleFormProps) {
  const queryClient = useQueryClient();
  const [athleteId, setAthleteId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleType, setCycleType] = useState<CycleType>("mesocycle");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const activeAthletes = (athletesQuery.data ?? []).filter((relation) => relation.status === "active");

  const createMutation = useMutation({
    mutationFn: cyclesApi.createCycle,
    onSuccess: (_, variables) => {
      track("cycle_created", { type: variables.cycleType });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onDone();
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo crear el ciclo.");
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
      cycleType,
      sessionsPerWeek: cycleType === "macrocycle" ? undefined : Number(sessionsPerWeek),
    });
  }

  return (
    <section className="lb-form" aria-label="Crear ciclo">
      <h2 className="section-title">Crear ciclo</h2>
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420 }}>
        {formError && <div className="error-banner">{formError}</div>}

        <div className="field">
          <label htmlFor="cycleAthlete">Atleta</label>
          <select id="cycleAthlete" required value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
            <option value="" disabled>
              Elige un atleta
            </option>
            {activeAthletes.map((relation) => (
              <option key={relation.athlete.id} value={relation.athlete.id}>
                {relation.athlete.name}
              </option>
            ))}
          </select>
          {athletesQuery.data && activeAthletes.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-ink-secondary)" }}>
              Todavía no tienes atletas activos. <Link to="/athletes">Invita uno primero</Link>.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="cycleType">Tipo de ciclo</label>
          <select id="cycleType" value={cycleType} onChange={(e) => setCycleType(e.target.value as CycleType)}>
            {Object.entries(CYCLE_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {cycleType === "macrocycle" ? (
          <p style={{ fontSize: "0.85rem", color: "var(--color-ink-secondary)" }}>
            Un macrociclo es un contenedor: agrupa varios mesociclos/microciclos, no tiene sesiones propias.
          </p>
        ) : (
          <div className="field">
            <label htmlFor="sessionsPerWeek">Sesiones por semana</label>
            <input
              id="sessionsPerWeek"
              type="number"
              min={1}
              required
              value={sessionsPerWeek}
              onChange={(e) => setSessionsPerWeek(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="cycleName">Nombre</label>
          <input id="cycleName" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="cycleObjective">Objetivo (opcional)</label>
          <input id="cycleObjective" type="text" value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="cycleStart">Inicio</label>
            <input id="cycleStart" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="cycleEnd">Fin</label>
            <input id="cycleEnd" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            className="button-primary"
            style={{ width: "auto" }}
            disabled={createMutation.isPending || activeAthletes.length === 0}
          >
            {createMutation.isPending ? "Creando…" : "Crear ciclo"}
          </button>
          <button type="button" className="button-secondary" style={{ width: "auto" }} onClick={onDone}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
