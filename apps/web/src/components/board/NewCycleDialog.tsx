import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../../services/cyclesApi";
import * as athletesApi from "../../services/athletesApi";
import { ApiError } from "../../services/httpClient";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { toLocalDay } from "../../lib/calendar";
import { busyDays, EMPTY_RANGE, pickDay, type Range } from "../../lib/cycleRange";
import { CycleRangePicker } from "../cycles/CycleRangePicker";
import { track } from "../../lib/analytics";

// «Nuevo ciclo» (CYC-314): solo se escribe el nombre (y el objetivo, opcional); el inicio y la
// duración salen del calendario. Desde la ficha del atleta, el atleta ya está fijado; desde la
// Biblioteca se elige aquí.
export function NewCycleDialog({
  athleteName,
  athleteId,
  parentCycleId,
  onClose,
  onCreated,
}: {
  athleteName?: string;
  athleteId?: string;
  // Solo para sumar un ciclo a un macrociclo que ya existe.
  parentCycleId?: string;
  onClose: () => void;
  onCreated: (cycle: TrainingCycle) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const today = toLocalDay(new Date());
  const [pickedAthlete, setPickedAthlete] = useState("");
  const chosenId = athleteId ?? pickedAthlete;
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [range, setRange] = useState<Range>(EMPTY_RANGE);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes, enabled: !athleteId });
  const activeAthletes = (athletesQuery.data ?? []).filter((r) => r.status === "active");
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  // Los días de sus otros ciclos llevan un punto: informan, no bloquean.
  const marked = useMemo(
    () => busyDays((cyclesQuery.data ?? []).filter((c) => !c.isTemplate && c.status === "active" && c.athleteId === chosenId && c.cycleType !== "macrocycle")),
    [cyclesQuery.data, chosenId],
  );

  const nameBad = name.trim() === "";
  const valid = !nameBad && chosenId !== "" && range.start !== null && range.end !== null;

  const createMutation = useMutation({
    mutationFn: () =>
      cyclesApi.createCycle({
        athleteId: chosenId,
        name: name.trim(),
        objective: objective.trim() || undefined,
        startDate: range.start!,
        endDate: range.end!,
        today,
        parentCycleId,
      }),
    onSuccess: (cycle) => {
      track("cycle_created", { type: cycle.cycleType, via: athleteId ? "board" : "library" });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onCreated(cycle);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo crear el ciclo."),
  });

  const noAthletes = !athleteId && athletesQuery.isSuccess && activeAthletes.length === 0;

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal cy-modal" role="dialog" aria-modal="true" aria-labelledby="bd-nc-title">
        <header>
          <h2 id="bd-nc-title">{athleteName ? `Nuevo ciclo para ${athleteName}` : "Nuevo ciclo"}</h2>
        </header>
        <form
          className="bd-modal-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setAttempted(true);
            if (valid) createMutation.mutate();
          }}
        >
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {!athleteId && (
            <div>
              <label className="bd-lbl" htmlFor="bd-nc-athlete">
                Atleta
              </label>
              <select id="bd-nc-athlete" className={`bd-inp${attempted && !chosenId ? " bd-inp-bad" : ""}`} value={pickedAthlete} onChange={(e) => setPickedAthlete(e.target.value)}>
                <option value="" disabled>
                  Elige un atleta
                </option>
                {activeAthletes.map((r) => (
                  <option key={r.athlete.id} value={r.athlete.id}>
                    {r.athlete.name}
                  </option>
                ))}
              </select>
              {noAthletes && (
                <div className="tour-empty" role="status">
                  <b>Falta que tu atleta acepte</b>
                  <p>Para crear un ciclo necesitas un atleta que ya haya aceptado su invitación.</p>
                  <Link to="/athletes">Ver invitaciones</Link>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="bd-lbl" htmlFor="bd-nc-name">
              Nombre
            </label>
            <input
              id="bd-nc-name"
              data-autofocus
              className={`bd-inp${attempted && nameBad ? " bd-inp-bad" : ""}`}
              aria-invalid={(attempted && nameBad) || undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {attempted && nameBad && <p className="bd-hint bd-hint-bad">Ponle un nombre al ciclo</p>}
          </div>
          <div>
            <label className="bd-lbl" htmlFor="bd-nc-obj">
              Objetivo (opcional)
            </label>
            <input id="bd-nc-obj" className="bd-inp" value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div>
            <span className="bd-lbl">Fechas del ciclo</span>
            <CycleRangePicker value={range} onPick={(iso) => setRange((r) => pickDay(r, iso, today))} today={today} marked={marked} markedLabel="con otro ciclo suyo" />
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" data-tour="cycle-create" disabled={createMutation.isPending || !valid}>
              {createMutation.isPending ? "Creando…" : "Crear ciclo"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
