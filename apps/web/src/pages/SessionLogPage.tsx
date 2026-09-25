import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as sessionsApi from "../services/sessionsApi";
import * as executionApi from "../services/executionApi";
import { ApiError } from "../services/httpClient";
import { LoadingScreen } from "../components/LoadingScreen";
import { RestTimer } from "../components/RestTimer";
import { formatKg, formatNumber, formatRir } from "../lib/format";
import { newId } from "../lib/uuid";

// Registro de una sesión por el atleta, pensado para el celular: un
// ejercicio a la vez, cada serie pre-llenada con el objetivo, la pregunta de
// reps en reserva en la última serie y un cierre corto. Ver
// docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.1.

const RIR_OPTIONS = [0, 1, 2, 3, 4];

// Descanso por defecto cuando la rutina no define uno para el ejercicio.
const DEFAULT_REST_SECONDS = 90;

interface Rest {
  endsAt: number;
  totalSeconds: number;
  label: string;
  // Índice del ejercicio al que se pasa al terminar (descanso entre ejercicios).
  advanceTo: number | null;
  // Qué sigue, para el aviso al terminar.
  next: string;
}

// El descanso en curso se guarda en la sesión del navegador: sobrevive a una
// recarga o a que el celular bloquee la pantalla.
function restKey(sessionId: string) {
  return `cycles.rest.${sessionId}`;
}

function readRest(sessionId: string): Rest | null {
  try {
    const raw = sessionStorage.getItem(restKey(sessionId));
    return raw ? (JSON.parse(raw) as Rest) : null;
  } catch {
    return null;
  }
}

function writeRest(sessionId: string, rest: Rest | null) {
  try {
    if (rest) sessionStorage.setItem(restKey(sessionId), JSON.stringify(rest));
    else sessionStorage.removeItem(restKey(sessionId));
  } catch {
    // Sin almacenamiento: el descanso solo vive en memoria.
  }
}

// Escala CR-10 de Foster, con palabras en los puntos de referencia.
const SRPE_WORDS: Record<number, string> = {
  0: "reposo",
  1: "muy fácil",
  2: "fácil",
  3: "moderada",
  4: "algo dura",
  5: "dura",
  6: "dura",
  7: "muy dura",
  8: "muy dura",
  9: "casi al máximo",
  10: "máximo",
};

type Exercise = sessionsApi.SessionExerciseWithExercise;

function Stepper({
  id,
  label,
  value,
  step,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (value: number) => void;
}) {
  // El texto se edita libre (para poder escribir "82,5") y se confirma al salir del campo.
  const [text, setText] = useState(formatNumber(value));
  useEffect(() => setText(formatNumber(value)), [value]);

  function commit(next: number) {
    const clamped = Math.max(min, next);
    onChange(clamped);
    setText(formatNumber(clamped));
  }

  return (
    <div className="stepper">
      <label htmlFor={id}>{label}</label>
      <div className="stepper-control">
        <button type="button" aria-label={`Restar a ${label.toLowerCase()}`} onClick={() => commit(value - step)}>
          −
        </button>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const parsed = Number(text.replace(",", "."));
            if (Number.isNaN(parsed)) setText(formatNumber(value));
            else commit(parsed);
          }}
        />
        <button type="button" aria-label={`Sumar a ${label.toLowerCase()}`} onClick={() => commit(value + step)}>
          +
        </button>
      </div>
    </div>
  );
}

function ExerciseStep({
  exercise,
  isLast,
  onNext,
  onSetLogged,
  restSlot,
  notice,
}: {
  exercise: Exercise;
  isLast: boolean;
  onNext: () => void;
  onSetLogged: (setNumber: number) => void;
  // Mientras hay un descanso en curso, ocupa el lugar de la serie siguiente.
  restSlot: ReactNode | null;
  notice: string | null;
}) {
  const queryClient = useQueryClient();
  const logs = exercise.logs ?? [];
  const lastLog = logs[logs.length - 1];
  const setNumber = logs.length + 1;
  const done = logs.length >= exercise.targetSets;
  const isFinalSet = setNumber === exercise.targetSets;
  const hasWeight = exercise.targetWeight !== null && exercise.targetWeight !== undefined;

  const [reps, setReps] = useState(lastLog?.actualReps ?? exercise.targetReps);
  const [weight, setWeight] = useState(lastLog?.actualWeight ?? exercise.targetWeight ?? 0);
  const [rir, setRir] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logMutation = useMutation({
    mutationFn: (input: executionApi.LogSetInput) => executionApi.logSet(exercise.id, input),
    // El id lo genera el cliente: reintentar nunca duplica la serie.
    retry: 2,
    onSuccess: (_, input) => {
      setRir(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["sessions", exercise.sessionId] });
      onSetLogged(input.setNumber);
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo registrar la serie."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isFinalSet && rir === null) {
      setError("Indica cuántas reps más podías hacer.");
      return;
    }
    logMutation.mutate({
      id: newId(),
      setNumber,
      actualReps: reps,
      actualWeight: hasWeight ? weight : undefined,
      rir: isFinalSet && rir !== null ? rir : undefined,
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 className="section-title" style={{ fontSize: "1.4rem" }}>
        {exercise.exercise.name}
      </h1>
      <dl className="target-values">
        <div>
          <dt>Series</dt>
          <dd>
            {exercise.targetSets} × {exercise.targetReps}
          </dd>
        </div>
        <div>
          <dt>Peso</dt>
          <dd>{formatKg(exercise.targetWeight)}</dd>
        </div>
        <div>
          <dt>En reserva</dt>
          <dd>{exercise.targetRir === null || exercise.targetRir === undefined ? "—" : `${exercise.targetRir} reps`}</dd>
        </div>
      </dl>

      {logs.length > 0 && (
        <ul className="set-list">
          {logs.map((log) => (
            <li key={log.id} className="set-row">
              <span style={{ color: "var(--color-ink-secondary)" }}>Serie {log.setNumber}</span>
              <strong>{log.actualReps} reps</strong>
              <strong>{hasWeight ? formatKg(log.actualWeight) : ""}</strong>
              <span className="set-done" aria-label="Registrada">
                ✓
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <div className="error-banner">{error}</div>}
      {notice && !restSlot && (
        <div className="success-banner" role="status">
          {notice}
        </div>
      )}

      {restSlot ? (
        restSlot
      ) : done ? (
        <button type="button" className="button-primary button-big" onClick={onNext}>
          {isLast ? "Terminar sesión" : "Siguiente ejercicio"}
        </button>
      ) : (
        <form className="current-set" onSubmit={handleSubmit} noValidate>
          <strong>
            Serie {setNumber}
            {isFinalSet ? ", la última" : ""}
          </strong>
          <div className="stepper-row">
            <Stepper id="reps" label="Reps" value={reps} step={1} min={0} onChange={setReps} />
            {hasWeight && <Stepper id="weight" label="Peso (kg)" value={weight} step={2.5} min={0} onChange={setWeight} />}
          </div>
          {isFinalSet && (
            <fieldset className="choice-fieldset">
              <legend>¿Cuántas reps más podías hacer?</legend>
              <div className="choice-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
                {RIR_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rir === value}
                    onClick={() => setRir(value)}
                  >
                    {formatRir(value)}
                  </button>
                ))}
              </div>
              <span className="choice-hint">0 = no podías ni una más</span>
            </fieldset>
          )}
          <button type="submit" className="button-primary button-big" disabled={logMutation.isPending}>
            {logMutation.isPending ? "Registrando…" : `Registrar serie ${setNumber}`}
          </button>
        </form>
      )}

      {!done && !restSlot && (
        <button type="button" className="button-ghost" style={{ justifyContent: "center" }} onClick={onNext}>
          {isLast ? "Pasar al cierre" : "Pasar al siguiente ejercicio"}
        </button>
      )}
    </div>
  );
}

function FinishStep({ session }: { session: sessionsApi.SessionDetail }) {
  const queryClient = useQueryClient();
  const suggestedMinutes = session.startedAt
    ? Math.min(600, Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)))
    : 60;
  const [srpe, setSrpe] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(String(suggestedMinutes));
  const [pain, setPain] = useState(false);
  const [painNotes, setPainNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const feedbackMutation = useMutation({
    mutationFn: () =>
      executionApi.submitFeedback(session.id, {
        outcome: "completed",
        srpe: srpe ?? undefined,
        durationMinutes: Number(minutes),
        pain,
        painNotes: pain ? painNotes.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", session.id] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo terminar la sesión."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (srpe === null) {
      setError("Indica qué tan dura fue la sesión.");
      return;
    }
    const duration = Number(minutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      setError("La duración tiene que ser un número de minutos entre 1 y 600.");
      return;
    }
    setError(null);
    feedbackMutation.mutate();
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <h1 className="page-title">Terminar sesión</h1>
      {error && <div className="error-banner">{error}</div>}

      <fieldset className="choice-fieldset">
        <legend>¿Qué tan dura fue la sesión?</legend>
        <div className="choice-grid" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
          {Array.from({ length: 11 }, (_, value) => (
            <button
              key={value}
              type="button"
              aria-pressed={srpe === value}
              aria-label={`${value}: ${SRPE_WORDS[value]}`}
              onClick={() => setSrpe(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="choice-hint" aria-live="polite">
          {srpe === null ? "0 reposo, 5 dura, 10 máximo" : `${srpe}: ${SRPE_WORDS[srpe]}`}
        </span>
      </fieldset>

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="duration">Duración en minutos</label>
        <input
          id="duration"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          style={{ maxWidth: 120 }}
        />
      </div>

      <fieldset className="choice-fieldset">
        <legend>¿Sentiste dolor o molestia?</legend>
        <div className="choice-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" aria-pressed={!pain} onClick={() => setPain(false)}>
            No
          </button>
          <button type="button" aria-pressed={pain} onClick={() => setPain(true)}>
            Sí
          </button>
        </div>
        {pain && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="painNotes">¿Dónde y cuándo?</label>
            <textarea id="painNotes" rows={2} value={painNotes} onChange={(e) => setPainNotes(e.target.value)} />
          </div>
        )}
      </fieldset>

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="notes">Nota para tu coach (opcional)</label>
        <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button type="submit" className="button-primary button-big" disabled={feedbackMutation.isPending}>
        {feedbackMutation.isPending ? "Guardando…" : "Terminar sesión"}
      </button>
    </form>
  );
}

export function SessionLogPage() {
  const { id = "" } = useParams();
  const sessionQuery = useQuery({ queryKey: ["sessions", id], queryFn: () => sessionsApi.getSession(id) });
  const [index, setIndex] = useState<number | null>(null);
  const [rest, setRestState] = useState<Rest | null>(() => readRest(id));
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);

  const session = sessionQuery.data;

  const setRest = useCallback(
    (next: Rest | null) => {
      writeRest(id, next);
      setRestState(next);
    },
    [id],
  );

  const endRest = useCallback(
    (finished: boolean) => {
      if (!rest) return;
      if (rest.advanceTo !== null) setIndex(rest.advanceTo);
      setNotice(finished ? `Descanso terminado. Sigue con ${rest.next}.` : null);
      setRest(null);
    },
    [rest, setRest],
  );

  // Abrir el registro directo (sin pasar por "Empezar") también marca el inicio.
  useEffect(() => {
    if (session && !session.startedAt && !session.feedback?.length && !started.current) {
      started.current = true;
      executionApi.startSession(session.id).catch(() => undefined);
    }
  }, [session]);

  // Al abrir, se fija el primer ejercicio con series pendientes; después solo
  // se avanza con "Siguiente ejercicio", para que el atleta vea sus series
  // registradas antes de cambiar de ejercicio.
  useEffect(() => {
    if (session && index === null) {
      const pending = session.sessionExercises.findIndex((se) => (se.logs?.length ?? 0) < se.targetSets);
      setIndex(pending === -1 ? session.sessionExercises.length : pending);
    }
  }, [session, index]);

  if (sessionQuery.isLoading) return <LoadingScreen />;
  if (sessionQuery.isError || !session) {
    return <div className="error-banner">No se pudo cargar esta sesión.</div>;
  }

  const exercises = session.sessionExercises;
  const closed = session.feedback?.[0];
  const current = index ?? 0;

  if (closed) {
    return (
      <div className="log-shell">
        <h1 className="page-title">{closed.outcome === "completed" ? "Sesión registrada" : "Sesión omitida"}</h1>
        <div className="success-banner">Tu coach ya puede ver lo que registraste.</div>
        <Link className="button-primary button-big" to="/">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="log-shell">
      <div className="stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <Link className="page-back" to="/" style={{ marginBottom: 0 }}>
            ← {session.name}
          </Link>
          {current < exercises.length && (
            <span style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem" }}>
              Ejercicio {current + 1} de {exercises.length}
            </span>
          )}
        </div>
        <div className="log-progress" aria-hidden="true">
          {exercises.map((se, i) => (
            <span key={se.id} data-done={i < current || (se.logs?.length ?? 0) >= se.targetSets} />
          ))}
        </div>
      </div>

      {current < exercises.length ? (
        <ExerciseStep
          key={exercises[current].id}
          exercise={exercises[current]}
          isLast={current === exercises.length - 1}
          onNext={() => setIndex(current + 1)}
          notice={notice}
          onSetLogged={(setNumber) => {
            setNotice(null);
            const exercise = exercises[current];
            const nextExercise = exercises[current + 1];
            const finalSet = setNumber >= exercise.targetSets;
            // Tras la última serie del último ejercicio no hay descanso: sigue el cierre.
            if (finalSet && !nextExercise) return;
            const seconds = exercise.targetRestSeconds ?? DEFAULT_REST_SECONDS;
            setRest({
              endsAt: Date.now() + seconds * 1000,
              totalSeconds: seconds,
              label: finalSet ? `Descanso antes de ${nextExercise.exercise.name}` : `Descanso antes de la serie ${setNumber + 1}`,
              advanceTo: finalSet ? current + 1 : null,
              next: finalSet ? nextExercise.exercise.name : `la serie ${setNumber + 1}`,
            });
          }}
          restSlot={
            rest ? (
              <RestTimer
                key={rest.label}
                endsAt={rest.endsAt}
                totalSeconds={rest.totalSeconds}
                label={rest.label}
                onAdjust={(delta) =>
                  setRest({
                    ...rest,
                    endsAt: Math.max(Date.now(), rest.endsAt + delta * 1000),
                    totalSeconds: Math.max(15, rest.totalSeconds + delta),
                  })
                }
                onSkip={() => endRest(false)}
                onFinish={() => endRest(true)}
              />
            ) : null
          }
        />
      ) : (
        <FinishStep session={session} />
      )}
    </div>
  );
}
