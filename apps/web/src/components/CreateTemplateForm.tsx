import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as cyclesApi from "../services/cyclesApi";
import { ApiError } from "../services/httpClient";
import { CYCLE_TYPE_LABEL } from "../lib/library";

// Ciclo de la Biblioteca: se define por su duración y su frecuencia, sin atleta ni
// fechas, y se asigna después a uno o varios atletas.
export function CreateTemplateForm({ onDone }: { onDone: (message?: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [cycleType, setCycleType] = useState<"microcycle" | "mesocycle">("mesocycle");
  const [weeks, setWeeks] = useState("4");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("3");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: cyclesApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onDone("Ciclo guardado en tu Biblioteca. Asígnalo a un atleta cuando quieras.");
    },
    onError: (error: unknown) => setFormError(error instanceof ApiError ? error.message : "No se pudo crear el ciclo."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const weeksNumber = Number(weeks);
    const perWeek = Number(sessionsPerWeek);
    if (!name.trim()) return setFormError("Escribe el nombre del ciclo.");
    if (!Number.isInteger(weeksNumber) || weeksNumber < 1 || weeksNumber > 52) return setFormError("Las semanas van de 1 a 52.");
    if (!Number.isInteger(perWeek) || perWeek < 1 || perWeek > 14) return setFormError("Las sesiones por semana van de 1 a 14.");
    mutation.mutate({ name: name.trim(), objective: objective.trim() || undefined, cycleType, weeks: weeksNumber, sessionsPerWeek: perWeek });
  }

  return (
    <section className="lb-form" aria-label="Crear ciclo para la Biblioteca">
      <h2 className="section-title">Crear ciclo para la Biblioteca</h2>
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420 }}>
        {formError && (
          <div className="error-banner" role="alert">
            {formError}
          </div>
        )}
        <div className="field">
          <label htmlFor="tplName">Nombre</label>
          <input id="tplName" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tplObjective">Objetivo (opcional)</label>
          <input id="tplObjective" type="text" value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tplType">Tipo de ciclo</label>
          <select id="tplType" value={cycleType} onChange={(e) => setCycleType(e.target.value as "microcycle" | "mesocycle")}>
            <option value="mesocycle">{CYCLE_TYPE_LABEL.mesocycle}</option>
            <option value="microcycle">{CYCLE_TYPE_LABEL.microcycle}</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="tplWeeks">Semanas</label>
            <input id="tplWeeks" type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="tplPerWeek">Sesiones por semana</label>
            <input id="tplPerWeek" type="number" min={1} max={14} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="button-primary" style={{ width: "auto" }} disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar en la Biblioteca"}
          </button>
          <button type="button" className="button-secondary" style={{ width: "auto" }} onClick={() => onDone()}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
