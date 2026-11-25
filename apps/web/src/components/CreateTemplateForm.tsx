import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as cyclesApi from "../services/cyclesApi";
import { ApiError } from "../services/httpClient";

// Ciclo de la Biblioteca (plantilla): nombre, objetivo opcional y duración en semanas, sin atleta
// ni fechas. Se asigna después a uno o varios atletas.
export function CreateTemplateForm({ onDone }: { onDone: (message?: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [weeks, setWeeks] = useState("4");
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
    if (!name.trim()) return setFormError("Escribe el nombre del ciclo.");
    if (!Number.isInteger(weeksNumber) || weeksNumber < 1 || weeksNumber > 52) return setFormError("Las semanas van de 1 a 52.");
    mutation.mutate({ name: name.trim(), objective: objective.trim() || undefined, weeks: weeksNumber });
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
          <label htmlFor="tplWeeks">Duración en semanas</label>
          <input id="tplWeeks" type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
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
