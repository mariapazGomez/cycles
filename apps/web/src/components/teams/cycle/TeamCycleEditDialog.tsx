import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import { ApiError } from "../../../services/httpClient";
import * as teamCyclesApi from "../../../services/teamCyclesApi";
import { busyDays, dayName, outsideWarning, pickDay, pickEnd, type Range } from "../../../lib/cycleRange";
import { rangesCross, removalLines } from "../../../lib/teamCycle";
import { CycleRangePicker } from "../../cycles/CycleRangePicker";
import { ConfirmDialog, ImpactList } from "./ConfirmDialog";

// «Datos del ciclo» del equipo: nombre, objetivo y fechas. Con sesiones fuera del rango nuevo no se
// guarda; las ajustadas de una persona las revisa la API, que dice cuántas son y en qué fechas.
export function TeamCycleEditDialog({
  cycle,
  others,
  today,
  onClose,
  onDeleted,
}: {
  cycle: teamCyclesApi.TeamCycleDetail;
  others: teamCyclesApi.TeamCycleSummary[];
  today: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState(false);
  // Con el aviso de eliminar abierto, Escape cierra solo ese aviso.
  useDialogFocus(ref, () => !deleting && onClose());
  const queryClient = useQueryClient();
  const original: Range = { start: cycle.startDate.slice(0, 10), end: cycle.endDate.slice(0, 10) };
  const started = original.start! < today;
  const [name, setName] = useState(cycle.name);
  const [objective, setObjective] = useState(cycle.objective ?? "");
  const [range, setRange] = useState<Range>(original);
  const [newStart, setNewStart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keeping = started && !newStart;

  const active = others.filter((c) => c.status === "active" && c.id !== cycle.id);
  const busy = useMemo(() => busyDays(active), [others, cycle.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const crossed = range.start && range.end ? rangesCross(active, range.start, range.end) : false;
  const outside = outsideWarning(
    cycle.sessions.map((s) => ({ weekNumber: 1, scheduledDate: s.scheduledDate })),
    range,
    original,
  );
  const warning = outside ?? (crossed ? "El equipo ya tiene un ciclo en esas fechas. Elige otras." : null);
  const valid = name.trim() !== "" && range.start !== null && range.end !== null && !warning;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["team-cycles"] });
    queryClient.invalidateQueries({ queryKey: ["cycles"] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };
  const save = useMutation({
    mutationFn: () =>
      teamCyclesApi.updateTeamCycle(cycle.id, {
        name: name.trim(),
        objective: objective.trim(),
        ...(range.start !== original.start ? { startDate: range.start! } : {}),
        ...(range.end !== original.end ? { endDate: range.end! } : {}),
        today,
      }),
    onSuccess: () => {
      refresh();
      onClose();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo actualizar el ciclo."),
  });
  const impact = useQuery({ queryKey: ["team-cycles", cycle.id, "impact"], queryFn: () => teamCyclesApi.teamCycleRemovalImpact(cycle.id, today), enabled: deleting, gcTime: 0 });
  const remove = useMutation({
    mutationFn: () => teamCyclesApi.deleteTeamCycle(cycle.id, today),
    onSuccess: () => {
      refresh();
      onDeleted();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (valid) save.mutate();
  }

  return (
    <>
      <div className="bd-modal-wrap">
        <div className="bd-modal-scrim" onClick={onClose} />
        <div ref={ref} className="bd-modal cy-modal tmc-modal" role="dialog" aria-modal="true" aria-labelledby="tmc-data-title">
          <header>
            <h2 id="tmc-data-title">Datos del ciclo</h2>
          </header>
          <form className="bd-modal-body" noValidate onSubmit={submit}>
            {(warning ?? error) && (
              <p className="cy-warn" role="alert">
                {warning ?? error}
              </p>
            )}
            {started && <p className="cy-note">El ciclo ya empezó el {dayName(original.start!, today)}. El inicio se mantiene; si lo cambias, solo puede ser desde hoy.</p>}
            <div>
              <label className="bd-lbl" htmlFor="tmc-edit-name">
                Nombre
              </label>
              <input id="tmc-edit-name" data-autofocus className="bd-inp" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="bd-lbl" htmlFor="tmc-edit-obj">
                Objetivo (opcional)
              </label>
              <input id="tmc-edit-obj" className="bd-inp" maxLength={500} value={objective} onChange={(e) => setObjective(e.target.value)} />
            </div>
            <div>
              <span className="bd-lbl">Fechas del ciclo</span>
              <CycleRangePicker
                value={range}
                onPick={(iso) => {
                  setError(null);
                  setRange((r) => (keeping ? pickEnd(r, iso) : pickDay(r, iso, today)));
                }}
                today={today}
                keptStart={original.start}
                busy={busy}
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
              <button type="button" className="cy-link tmc-delete" onClick={() => setDeleting(true)}>
                Eliminar ciclo del equipo
              </button>
            </div>
            <footer>
              <button type="button" className="bd-btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="bd-btn bd-btn-p" disabled={!valid || save.isPending}>
                {save.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </footer>
          </form>
        </div>
      </div>
      {deleting && (
        <ConfirmDialog
          title={`Eliminar «${cycle.name}»`}
          confirmLabel="Eliminar ciclo"
          busyLabel="Eliminando…"
          busy={remove.isPending}
          disabled={!impact.data}
          error={remove.isError || impact.isError ? "No se pudo eliminar el ciclo. Intenta de nuevo." : null}
          onConfirm={() => remove.mutate()}
          onClose={() => setDeleting(false)}
        >
          {impact.data ? <ImpactList lines={removalLines(impact.data)} /> : <p>Calculando qué cambia…</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
