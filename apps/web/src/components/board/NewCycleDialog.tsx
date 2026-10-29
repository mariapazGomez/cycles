import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CycleType, TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../../services/cyclesApi";
import { ApiError } from "../../services/httpClient";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { CYCLE_TYPE_LABEL } from "../../lib/library";
import { MAX_WEEKS, endForWeeks } from "../../lib/newCycle";
import { shortDate } from "../../lib/weekCalendar";
import { track } from "../../lib/analytics";

// «Nuevo ciclo» desde la ficha del atleta: el atleta ya está fijado. Se piden las
// semanas en lugar de la fecha de fin; las fechas exactas se ajustan después en
// «Datos del ciclo». Los macrociclos se crean en la Biblioteca.
export function NewCycleDialog({
  athleteName,
  athleteId,
  defaultStart,
  defaultSessions,
  onClose,
  onCreated,
}: {
  athleteName: string;
  athleteId: string;
  defaultStart: string;
  defaultSessions: number | undefined;
  onClose: () => void;
  onCreated: (cycle: TrainingCycle) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [cycleType, setCycleType] = useState<Exclude<CycleType, "macrocycle">>("mesocycle");
  const [sessions, setSessions] = useState(String(defaultSessions ?? 3));
  const [start, setStart] = useState(defaultStart);
  const [weeks, setWeeks] = useState("6");
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionsNum = Number(sessions);
  const weeksNum = Number(weeks);
  const bad = {
    name: name.trim() === "",
    sessions: !Number.isInteger(sessionsNum) || sessionsNum < 1 || sessionsNum > 7,
    start: !/^\d{4}-\d{2}-\d{2}$/.test(start),
    weeks: !Number.isInteger(weeksNum) || weeksNum < 1 || weeksNum > MAX_WEEKS,
  };
  const valid = !Object.values(bad).some(Boolean);
  const end = valid ? endForWeeks(start, weeksNum) : null;

  const createMutation = useMutation({
    mutationFn: () =>
      cyclesApi.createCycle({
        athleteId,
        name: name.trim(),
        objective: objective.trim() || undefined,
        startDate: start,
        endDate: end!,
        cycleType,
        sessionsPerWeek: sessionsNum,
      }),
    onSuccess: (cycle) => {
      track("cycle_created", { type: cycle.cycleType, via: "board" });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onCreated(cycle);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo crear el ciclo."),
  });

  const show = (key: keyof typeof bad) => attempted && bad[key];

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="bd-nc-title">
        <header>
          <h2 id="bd-nc-title">Nuevo ciclo para {athleteName}</h2>
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
          <div>
            <label className="bd-lbl" htmlFor="bd-nc-name">
              Nombre
            </label>
            <input
              id="bd-nc-name"
              data-autofocus
              className={`bd-inp${show("name") ? " bd-inp-bad" : ""}`}
              aria-invalid={show("name") || undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {show("name") && <p className="bd-hint bd-hint-bad">Ponle un nombre al ciclo</p>}
          </div>
          <div>
            <label className="bd-lbl" htmlFor="bd-nc-obj">
              Objetivo (opcional)
            </label>
            <input id="bd-nc-obj" className="bd-inp" value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div className="bd-fgrid">
            <div>
              <label className="bd-lbl" htmlFor="bd-nc-type">
                Tipo de ciclo
              </label>
              <select id="bd-nc-type" className="bd-inp" value={cycleType} onChange={(e) => setCycleType(e.target.value as typeof cycleType)}>
                <option value="mesocycle">{CYCLE_TYPE_LABEL.mesocycle}</option>
                <option value="microcycle">{CYCLE_TYPE_LABEL.microcycle}</option>
              </select>
            </div>
            <div>
              <label className="bd-lbl" htmlFor="bd-nc-sessions">
                Sesiones por semana
              </label>
              <input
                id="bd-nc-sessions"
                className={`bd-inp${show("sessions") ? " bd-inp-bad" : ""}`}
                inputMode="numeric"
                aria-invalid={show("sessions") || undefined}
                value={sessions}
                onChange={(e) => setSessions(e.target.value)}
              />
              <p className={`bd-hint${show("sessions") ? " bd-hint-bad" : ""}`}>{show("sessions") ? "Un número de 1 a 7" : "Es solo una guía"}</p>
            </div>
            <div>
              <label className="bd-lbl" htmlFor="bd-nc-start">
                Inicio
              </label>
              <input
                id="bd-nc-start"
                type="date"
                className={`bd-inp${show("start") ? " bd-inp-bad" : ""}`}
                aria-invalid={show("start") || undefined}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              {show("start") && <p className="bd-hint bd-hint-bad">Elige la fecha de inicio</p>}
            </div>
            <div>
              <label className="bd-lbl" htmlFor="bd-nc-weeks">
                Semanas
              </label>
              <input
                id="bd-nc-weeks"
                className={`bd-inp${show("weeks") ? " bd-inp-bad" : ""}`}
                inputMode="numeric"
                aria-invalid={show("weeks") || undefined}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
              />
              <p className={`bd-hint${show("weeks") ? " bd-hint-bad" : ""}`}>
                {show("weeks") ? `Un número de 1 a ${MAX_WEEKS}` : end ? `Termina el ${shortDate(end)}` : " "}
              </p>
            </div>
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando…" : "Crear ciclo"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
