import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as exercisesApi from "../../services/exercisesApi";
import * as rmApi from "../../services/rmApi";
import { toLocalDay } from "../../lib/calendar";
import { formatNumber } from "../../lib/format";
import { parseNumber } from "../../lib/routineStats";
import { EPLEY_MAX_REPS, EPLEY_MIN_REPS, epleyRm, epleyStepsText } from "../../lib/rmCalc";

export interface RmDialogProps {
  athleteId: string;
  athleteName: string;
  // Ejercicio ya elegido (desde «Actualizar» o «Agregar RM» de una fila); sin él, se elige.
  exerciseId?: string;
  // Máximo levantado de referencia: «Usar el máximo levantado» solo copia estos dos números.
  maxLifted?: { weightKg: number; reps: number } | null;
  // Abrir directo en la calculadora (salida «Calcular un RM aproximado»).
  startInCalculator?: boolean;
  onClose: () => void;
}

// «Agregar RM» / «Actualizar» (solo el coach registra el RM) y, dentro, la calculadora de RM
// aproximado (Epley). Cada evaluación agrega una fila: las anteriores quedan en el historial.
export function RmDialog({ athleteId, athleteName, exerciseId: presetId, maxLifted, startInCalculator = false, onClose }: RmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });
  const [exerciseId, setExerciseId] = useState(presetId ?? "");
  const [calc, setCalc] = useState(startInCalculator);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(toLocalDay(new Date()));
  const [calcWeight, setCalcWeight] = useState(maxLifted ? String(maxLifted.weightKg).replace(".", ",") : "");
  const [calcReps, setCalcReps] = useState(maxLifted ? String(maxLifted.reps) : "");
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exercises = useMemo(() => [...(exercisesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "es")), [exercisesQuery.data]);
  const exerciseName = exercises.find((e) => e.id === exerciseId)?.name;

  const calcResult = epleyRm(parseNumber(calcWeight), parseNumber(calcReps));
  const weightNum = parseNumber(weight);
  const weightOk = Number.isFinite(weightNum) && weightNum >= 0.5 && weightNum <= 1000;
  const dateOk = date !== "" && date <= toLocalDay(new Date(Date.now() + 24 * 3600 * 1000));

  const mutation = useMutation({
    mutationFn: (input: rmApi.RecordRmInput) => rmApi.recordRm(athleteId, exerciseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rm", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onClose();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo guardar el RM."),
  });

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAttempted(true);
    if (!exerciseId || !weightOk || !dateOk) return;
    mutation.mutate({ weightKg: Math.round(weightNum * 100) / 100, measuredAt: date });
  }

  function useCalculated() {
    setError(null);
    setAttempted(true);
    if (!exerciseId || !calcResult || !dateOk) return;
    mutation.mutate({
      weightKg: calcResult.rmKg,
      measuredAt: date,
      source: "estimated",
      estimatedFromWeightKg: parseNumber(calcWeight),
      estimatedFromReps: parseNumber(calcReps),
    });
  }

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="rm-dialog-title">
        <header>
          <h2 id="rm-dialog-title">{calc ? "Calcular un RM aproximado" : presetId && !startInCalculator ? "Actualizar RM" : "Agregar RM"}</h2>
        </header>
        <form className="bd-modal-body" noValidate onSubmit={calc ? (e) => { e.preventDefault(); useCalculated(); } : save}>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div>
            <span className="bd-lbl">Atleta</span>
            <div className="bd-inp rm-static">{athleteName}</div>
          </div>
          <div>
            <label className="bd-lbl" htmlFor="rm-exercise">
              Ejercicio
            </label>
            <select
              id="rm-exercise"
              data-autofocus={!presetId ? true : undefined}
              className={`bd-inp${attempted && !exerciseId ? " bd-inp-bad" : ""}`}
              value={exerciseId}
              disabled={!!presetId}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              <option value="">Elige un ejercicio</option>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {attempted && !exerciseId && <p className="bd-hint bd-hint-bad">Elige un ejercicio</p>}
          </div>

          {calc ? (
            <>
              <p className="rm-note">Úsalo cuando aún no hay una evaluación. Tú eliges los datos y tú confirmas el resultado.</p>
              <div className="rm-pair">
                <div>
                  <label className="bd-lbl" htmlFor="rm-calc-w">
                    Peso levantado (kg)
                  </label>
                  <input id="rm-calc-w" data-autofocus className="bd-inp" inputMode="decimal" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value)} />
                </div>
                <div>
                  <label className="bd-lbl" htmlFor="rm-calc-r">
                    Repeticiones
                  </label>
                  <input id="rm-calc-r" className="bd-inp" inputMode="numeric" value={calcReps} onChange={(e) => setCalcReps(e.target.value)} />
                </div>
              </div>
              {maxLifted && (
                <button
                  type="button"
                  className="bld-link"
                  onClick={() => {
                    setCalcWeight(String(maxLifted.weightKg).replace(".", ","));
                    setCalcReps(String(maxLifted.reps));
                  }}
                >
                  Usar el máximo levantado ({formatNumber(maxLifted.weightKg)} kg × {maxLifted.reps})
                </button>
              )}
              <div className="rm-formula">
                <b>Cómo se calcula</b>
                <span className="rm-formula-eq">RM ≈ peso × (1 + repeticiones ÷ 30)</span>
                {calcResult ? <span>Con tus datos: {epleyStepsText(parseNumber(calcWeight), parseNumber(calcReps), calcResult)}</span> : <span>Escribe un peso y de {EPLEY_MIN_REPS} a {EPLEY_MAX_REPS} repeticiones.</span>}
              </div>
              {calcResult && (
                <div className="rm-result" role="status">
                  RM aproximado: {formatNumber(calcResult.rmKg)} kg
                </div>
              )}
              {calcResult?.imprecise && <p className="bd-hint bd-hint-bad">Con más de 10 repeticiones el resultado es poco preciso.</p>}
              <ul className="rm-rules">
                <li>Funciona mejor con series de 2 a 10 repeticiones hechas cerca de la falla.</li>
                <li>Se redondea al 0,5 kg más cercano.</li>
                <li>Queda marcado «Aproximado», con los datos usados, hasta que lo reemplaces con una evaluación.</li>
              </ul>
            </>
          ) : (
            <div className="rm-pair">
              <div>
                <label className="bd-lbl" htmlFor="rm-weight">
                  RM (kg)
                </label>
                <input
                  id="rm-weight"
                  data-autofocus={presetId ? true : undefined}
                  className={`bd-inp${attempted && !weightOk ? " bd-inp-bad" : ""}`}
                  inputMode="decimal"
                  placeholder="kg"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                {attempted && !weightOk && <p className="bd-hint bd-hint-bad">Un peso de 0,5 a 1000 kg</p>}
              </div>
              <div>
                <label className="bd-lbl" htmlFor="rm-date">
                  Fecha de la evaluación
                </label>
                <input id="rm-date" type="date" className={`bd-inp${attempted && !dateOk ? " bd-inp-bad" : ""}`} value={date} onChange={(e) => setDate(e.target.value)} />
                {attempted && !dateOk && <p className="bd-hint bd-hint-bad">La fecha no puede ser futura</p>}
              </div>
            </div>
          )}

          {!calc && (
            <button type="button" className="bld-link" onClick={() => setCalc(true)}>
              Calcular un RM aproximado
            </button>
          )}
          {!calc && maxLifted && (
            <p className="rm-note">
              <b>
                Máximo levantado: {formatNumber(maxLifted.weightKg)} kg × {maxLifted.reps}.
              </b>{" "}
              Es una referencia. El RM es el mayor peso con el que hace una sola repetición bien hecha.
            </p>
          )}
          <footer>
            <button type="button" className="bd-btn" onClick={calc && !startInCalculator ? () => setCalc(false) : onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" disabled={mutation.isPending || (calc && !calcResult)}>
              {mutation.isPending ? "Guardando…" : calc ? "Usar como RM" : "Guardar RM"}
            </button>
          </footer>
        </form>
        {exerciseName && <span className="sr-only">Ejercicio: {exerciseName}</span>}
      </div>
    </div>
  );
}
