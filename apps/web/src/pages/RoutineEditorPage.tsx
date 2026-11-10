import { FormEvent, useEffect, useState } from "react";
import { NOTE_MAX_LENGTH } from "../components/ExerciseNote";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import * as exercisesApi from "../services/exercisesApi";
import { ExercisePicker } from "../components/ExercisePicker";
import { EmptyState } from "../components/EmptyState";
import { muscleGroupLabel } from "../lib/muscleGroups";
import { formatInteger, formatNumber } from "../lib/format";
import { libraryPath } from "../lib/library";
import { isRowComplete } from "../lib/routineStats";
import { SeriesStepper } from "../components/routine/SeriesStepper";
import { DRAFT_MESSAGES } from "../lib/routineDraft";
import { useRoutineDraft } from "../hooks/useRoutineDraft";
import { useSaveRoutine } from "../hooks/useSaveRoutine";

// Tono de cada cuenta de la cadena; se repite en ciclo.
const BEAD_TONES = ["var(--color-brand)", "var(--color-blue)", "var(--color-blue-700)"];
const BAR_TONES = ["var(--color-blue-700)", "var(--color-blue)", "var(--color-brand)", "var(--color-blue-400)", "var(--color-blue-300)"];

export function RoutineEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const draft = useRoutineDraft();
  const { rows, stats, attempted, error: formError } = draft;
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const routineQuery = useQuery({
    queryKey: ["routines", id],
    queryFn: () => routinesApi.getRoutine(id as string),
    enabled: Boolean(id),
  });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });

  // Al editar, se llena el formulario una sola vez con la rutina guardada.
  useEffect(() => {
    if (routineQuery.data && loadedId !== routineQuery.data.id) {
      setLoadedId(routineQuery.data.id);
      draft.load(routineQuery.data);
    }
  }, [routineQuery.data, loadedId]);

  // Tras agregar un ejercicio, el cursor va a sus repeticiones.
  useEffect(() => {
    if (focusKey) {
      document.getElementById(`reps-${focusKey}`)?.focus();
      setFocusKey(null);
    }
  }, [focusKey, rows]);

  const saveMutation = useSaveRoutine({
    routineId: id,
    getPayload: draft.payload,
    exerciseCount: () => rows.length,
    onSaved: () => navigate(libraryPath("routine")),
    onError: draft.setError,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft.check()) saveMutation.mutate();
  }

  if (id && routineQuery.isLoading) return <p>Cargando…</p>;
  if (id && routineQuery.isError) {
    return (
      <div className="stack">
        <Link className="rt-back" to={libraryPath("routine")}>
          ← Biblioteca
        </Link>
        <div className="error-banner">No se encontró la rutina.</div>
      </div>
    );
  }

  const statusText =
    rows.length === 0
      ? DRAFT_MESSAGES.empty
      : stats.incompleteCount > 0
        ? `Falta completar ${stats.incompleteCount} ${stats.incompleteCount === 1 ? "ejercicio" : "ejercicios"}.`
        : "Lista para guardar.";
  const saveLabel = saveMutation.isPending ? "Guardando…" : "Guardar rutina";

  return (
    <form className="rt-page" onSubmit={handleSubmit} noValidate>
      <Link className="rt-back" to={libraryPath("routine")}>
        ← Biblioteca
      </Link>
      <div className="page-header" style={{ marginTop: 8 }}>
        <h1 className="page-title">{id ? "Editar rutina" : "Nueva rutina"}</h1>
      </div>

      {formError && (
        <div className="error-banner" role="alert">
          {formError}
        </div>
      )}

      <div className="rt-layout">
        <div>
          <div className="rt-name">
            <label className="rt-label" htmlFor="routineName">
              Nombre
            </label>
            <input
              id="routineName"
              className="rt-input"
              type="text"
              value={draft.name}
              onChange={(e) => draft.setName(e.target.value)}
            />
          </div>

          <div className="rt-section-head">
            <h2>Ejercicios</h2>
          </div>

          {rows.length === 0 && (
            <>
              <EmptyState title="Arma tu primera cadena">
                Agrega el primer ejercicio y define series, reps y carga.
              </EmptyState>
              <div style={{ height: 16 }} />
            </>
          )}

          <ol className={rows.length === 0 ? "rt-chain rt-chain-empty" : "rt-chain"}>
            {rows.map((row, index) => {
              const complete = isRowComplete(row);
              const showMissing = attempted && !complete;
              return (
                <li
                  key={row.key}
                  className={complete ? "rt-node" : "rt-node rt-node-todo"}
                  style={{ ["--c" as string]: BEAD_TONES[index % BEAD_TONES.length] }}
                >
                  <span className="rt-bead" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="rt-card">
                    <div className="rt-ex-top">
                      <span className="rt-ex-name">{row.name}</span>
                      <span className="rt-chip">{muscleGroupLabel(row.muscleGroup)}</span>
                      <button
                        type="button"
                        className="rt-ghost"
                        aria-label={`Subir ${row.name}`}
                        disabled={index === 0}
                        onClick={() => draft.moveRow(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rt-ghost"
                        aria-label={`Bajar ${row.name}`}
                        disabled={index === rows.length - 1}
                        onClick={() => draft.moveRow(index, 1)}
                      >
                        ↓
                      </button>
                      <button type="button" className="rt-ghost" onClick={() => draft.duplicateRow(index)}>
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className="rt-ghost"
                        onClick={() => draft.removeRow(row.key)}
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="rt-fields">
                      <SeriesStepper prefix="rt" value={row.sets} onChange={(sets) => draft.updateRow(row.key, { sets })} />
                      <div>
                        <label className="rt-label" htmlFor={`reps-${row.key}`}>
                          Reps
                        </label>
                        <input
                          id={`reps-${row.key}`}
                          className={showMissing ? "rt-input rt-input-missing" : "rt-input"}
                          inputMode="numeric"
                          value={row.reps}
                          onChange={(e) => draft.updateRow(row.key, { reps: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="rt-label" htmlFor={`weight-${row.key}`}>
                          Carga
                        </label>
                        <div className="rt-suffix">
                          <input
                            id={`weight-${row.key}`}
                            className="rt-input"
                            inputMode="decimal"
                            value={row.weight}
                            onChange={(e) => draft.updateRow(row.key, { weight: e.target.value })}
                          />
                          <span>kg</span>
                        </div>
                      </div>
                      <div>
                        <label className="rt-label" htmlFor={`rest-${row.key}`}>
                          Descanso
                        </label>
                        <div className="rt-suffix">
                          <input
                            id={`rest-${row.key}`}
                            className="rt-input"
                            inputMode="numeric"
                            value={row.restSeconds}
                            onChange={(e) => draft.updateRow(row.key, { restSeconds: e.target.value })}
                          />
                          <span>s</span>
                        </div>
                      </div>
                      <div>
                        <label className="rt-label" htmlFor={`rir-${row.key}`}>
                          RIR
                        </label>
                        <select
                          id={`rir-${row.key}`}
                          className="rt-input"
                          aria-label="Reps en reserva objetivo"
                          value={row.rir}
                          onChange={(e) => draft.updateRow(row.key, { rir: e.target.value })}
                        >
                          <option value="">Sin objetivo</option>
                          {[0, 1, 2, 3, 4].map((value) => (
                            <option key={value} value={value}>
                              {value === 4 ? "4 o más" : value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="rt-note">
                      <label className="rt-label" htmlFor={`note-${row.key}`}>
                        Nota para el atleta (opcional)
                      </label>
                      <textarea
                        id={`note-${row.key}`}
                        className="rt-input"
                        rows={2}
                        maxLength={NOTE_MAX_LENGTH}
                        placeholder="Por ejemplo: baja lento y cuida el hombro"
                        value={row.note}
                        onChange={(e) => draft.updateRow(row.key, { note: e.target.value })}
                      />
                      {row.note.length > 400 && (
                        <span className="ex-note-count">
                          {row.note.length}/{NOTE_MAX_LENGTH}
                        </span>
                      )}
                    </div>

                    {showMissing && <p className="rt-warn">Completa series y reps para guardar.</p>}
                  </div>
                </li>
              );
            })}
            <li className="rt-node" style={{ listStyle: "none" }}>
              {rows.length > 0 && (
                <span className="rt-bead rt-bead-add" aria-hidden="true">
                  +
                </span>
              )}
              <ExercisePicker
                exercises={exercisesQuery.data}
                isLoading={exercisesQuery.isLoading}
                isError={exercisesQuery.isError}
                onPick={(exercise) => setFocusKey(draft.addExercise(exercise))}
              />
            </li>
          </ol>
        </div>

        <aside className="rt-side" aria-label="Carga de la sesión">
          <h2>Carga de la sesión</h2>
          <div className="rt-kpis">
            <div className="rt-kpi">
              <span>Series</span>
              <b>{formatInteger(stats.sets)}</b>
            </div>
            <div className="rt-kpi">
              <span>Duración</span>
              <b>
                {stats.sets > 0 ? "~" : ""}
                {formatInteger(stats.durationMinutes)} <small>min</small>
              </b>
            </div>
            <div className="rt-kpi rt-kpi-wide">
              <span>Volumen</span>
              <b>
                {formatInteger(stats.volumeKg)} <small>kg</small>
              </b>
            </div>
          </div>

          <div>
            <span className="rt-label">Series por grupo muscular</span>
            {stats.setsByGroup.length === 0 ? (
              <p className="rt-hint">Aparecerán al completar ejercicios.</p>
            ) : (
              <ul className="rt-groups">
                {stats.setsByGroup.map((entry, index) => {
                  const percent = Math.round((entry.sets / stats.sets) * 100);
                  return (
                    <li key={entry.group}>
                      <div className="rt-group-line">
                        <span>{entry.group}</span>
                        <span>
                          {formatInteger(entry.sets)} {entry.sets === 1 ? "serie" : "series"}, {percent}%
                        </span>
                      </div>
                      <div className="rt-track">
                        <i style={{ width: `${percent}%`, background: BAR_TONES[Math.min(index, BAR_TONES.length - 1)] }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {stats.averageRir !== null && <p className="rt-hint">RIR promedio: {formatNumber(stats.averageRir)}</p>}
          <p className={stats.incompleteCount > 0 || rows.length === 0 ? "rt-status" : "rt-status rt-status-ok"}>
            {statusText}
          </p>

          <div className="rt-actions">
            <button type="submit" className="button-primary" disabled={saveMutation.isPending}>
              {saveLabel}
            </button>
            <Link className="button-secondary" to={libraryPath("routine")}>
              Cancelar
            </Link>
          </div>
          <p className="rt-foot">Volumen = series × reps × carga. Duración = 40 s de trabajo por serie más el descanso.</p>
        </aside>
      </div>

      <div className="rt-bar">
        <div className="rt-bar-text">
          <b style={{ fontWeight: 600 }}>{formatInteger(stats.sets)} series</b>
          <span>
            {stats.sets > 0 ? `~${formatInteger(stats.durationMinutes)} min, ` : ""}
            {formatInteger(stats.volumeKg)} kg
          </span>
        </div>
        <button type="submit" className="button-primary" disabled={saveMutation.isPending}>
          {saveLabel}
        </button>
      </div>
    </form>
  );
}
