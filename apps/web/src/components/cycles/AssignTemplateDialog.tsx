import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../../services/cyclesApi";
import { ApiError } from "../../services/httpClient";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { toLocalDay } from "../../lib/calendar";
import { busyDays, EMPTY_RANGE, rangeForWeeks, rangeSummary, type Range } from "../../lib/cycleRange";
import { CycleRangePicker } from "./CycleRangePicker";

// Asignar una plantilla (CYC-314): se elige solo el primer día, desde hoy; el último sale de las
// semanas de la plantilla. Se crea un ciclo vacío, como siempre.
export function AssignTemplateDialog({
  template,
  athlete,
  onClose,
  onAssigned,
}: {
  template: { id: string; name: string; weeks: number };
  athlete: { id: string; name: string };
  onClose: () => void;
  onAssigned: (cycle: TrainingCycle) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const today = toLocalDay(new Date());
  const weeks = Math.max(1, template.weeks);
  const [range, setRange] = useState<Range>(EMPTY_RANGE);
  const [error, setError] = useState<string | null>(null);
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const marked = useMemo(
    () => busyDays((cyclesQuery.data ?? []).filter((c) => !c.isTemplate && c.status === "active" && c.athleteId === athlete.id && c.cycleType !== "macrocycle")),
    [cyclesQuery.data, athlete.id],
  );
  const mutation = useMutation({
    mutationFn: () => cyclesApi.assignTemplate(template.id, { athleteId: athlete.id, startDate: range.start!, today }),
    onSuccess: (cycle) => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onAssigned(cycle);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo asignar el ciclo."),
  });

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal cy-modal" role="dialog" aria-modal="true" aria-labelledby="cy-assign-title">
        <header>
          <h2 id="cy-assign-title">
            Asignar «{template.name}» a {athlete.name}
          </h2>
        </header>
        <div className="bd-modal-body">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <p className="cy-note">
            Elige solo el primer día, desde hoy. El final sale de las {weeks} {weeks === 1 ? "semana" : "semanas"} de la plantilla.
          </p>
          <div>
            <span className="bd-lbl">Fechas del ciclo</span>
            <CycleRangePicker
              value={range}
              onPick={(iso) => setRange(rangeForWeeks(iso, weeks))}
              today={today}
              marked={marked}
              markedLabel="con otro ciclo suyo"
              summary={range.start ? rangeSummary(range, today) : "Elige el primer día."}
            />
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="bd-btn bd-btn-p" disabled={!range.start || mutation.isPending} onClick={() => { setError(null); mutation.mutate(); }}>
              {mutation.isPending ? "Asignando…" : "Asignar ciclo"}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
