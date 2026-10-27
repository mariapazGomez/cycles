import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus, TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import { ApiError } from "../services/httpClient";
import { CYCLE_STATUS_LABEL } from "../lib/library";

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

// Formulario de «Editar ciclo»: lo usan la ficha del atleta y la página del macrociclo.
export function CycleEditForm({ cycle, onClose }: { cycle: TrainingCycle; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editError, setEditError] = useState<string | null>(null);

  const updateCycleMutation = useMutation({
    mutationFn: (data: Parameters<typeof cyclesApi.updateCycle>[1]) => cyclesApi.updateCycle(cycle.id, data),
    onSuccess: () => {
      onClose();
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
    },
    onError: (error: unknown) => {
      setEditError(error instanceof ApiError ? error.message : "No se pudo actualizar el ciclo.");
    },
  });

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
  );
}
