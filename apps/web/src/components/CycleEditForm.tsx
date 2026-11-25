import { FormEvent, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CycleStatus, TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import { ApiError } from "../services/httpClient";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { toLocalDay } from "../lib/calendar";
import { dayName, pickDay, pickEnd, type Range } from "../lib/cycleRange";
import { CycleRangePicker } from "./cycles/CycleRangePicker";
import { CYCLE_STATUS_LABEL } from "../lib/library";

// «Datos del ciclo» (CYC-314): nombre, objetivo, fechas en el calendario y estado. Si el ciclo ya
// empezó, el inicio se conserva y los toques cambian el último día; un inicio nuevo solo puede ser
// desde hoy.
export function CycleEditForm({ cycle, onClose }: { cycle: TrainingCycle; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const today = toLocalDay(new Date());
  const original: Range = { start: cycle.startDate.slice(0, 10), end: cycle.endDate.slice(0, 10) };
  const started = original.start! < today;
  const [name, setName] = useState(cycle.name);
  const [objective, setObjective] = useState(cycle.objective ?? "");
  const [status, setStatus] = useState<CycleStatus>(cycle.status);
  const [range, setRange] = useState<Range>(original);
  // En un ciclo empezado, «Cambiar el inicio» pasa a elegir un rango nuevo desde hoy.
  const [newStart, setNewStart] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const keeping = started && !newStart;

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

  const valid = name.trim() !== "" && range.start !== null && range.end !== null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEditError(null);
    if (!valid) return;
    updateCycleMutation.mutate({
      name: name.trim(),
      objective: objective.trim(),
      // Solo se mandan las fechas que cambiaron: así un ciclo antiguo se edita sin tocarlas.
      ...(range.start !== original.start ? { startDate: range.start!, today } : {}),
      ...(range.end !== original.end ? { endDate: range.end! } : {}),
      status,
    });
  }

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal cy-modal" role="dialog" aria-modal="true" aria-labelledby="cy-edit-title">
        <header>
          <h2 id="cy-edit-title">Datos del ciclo</h2>
        </header>
        <form onSubmit={handleSubmit} noValidate className="bd-modal-body">
          {editError && (
            <div className="error-banner" role="alert">
              {editError}
            </div>
          )}
          {started && (
            <p className="cy-note">
              El ciclo ya empezó el {dayName(original.start!, today)}. Puedes cambiar el nombre, el objetivo y el último día. El inicio se mantiene; si lo cambias, solo puede ser desde hoy.
            </p>
          )}
          <div>
            <label className="bd-lbl" htmlFor="editName">
              Nombre
            </label>
            <input id="editName" data-autofocus className="bd-inp" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="bd-lbl" htmlFor="editObjective">
              Objetivo (opcional)
            </label>
            <input id="editObjective" className="bd-inp" value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div>
            <span className="bd-lbl">Fechas del ciclo</span>
            <CycleRangePicker
              value={range}
              onPick={(iso) => setRange((r) => (keeping ? pickEnd(r, iso) : pickDay(r, iso, today)))}
              today={today}
              keptStart={original.start}
            />
            {started && (
              <button
                type="button"
                className="cy-link"
                onClick={() => {
                  setNewStart((v) => !v);
                  setRange(original);
                }}
              >
                {newStart ? "Conservar el inicio actual" : "Cambiar el inicio"}
              </button>
            )}
          </div>
          <div>
            <label className="bd-lbl" htmlFor="editStatus">
              Estado
            </label>
            <select id="editStatus" className="bd-inp" value={status} onChange={(e) => setStatus(e.target.value as CycleStatus)}>
              {Object.entries(CYCLE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" disabled={!valid || updateCycleMutation.isPending}>
              {updateCycleMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
