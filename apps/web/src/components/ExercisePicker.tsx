import { useId, useMemo, useState } from "react";
import type { Exercise } from "@cycles/shared";
import { ExerciseFormCard } from "./ExerciseForm";
import { muscleGroupLabel } from "../lib/muscleGroups";

const MAX_RESULTS = 8;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

interface ExercisePickerProps {
  exercises: Exercise[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onPick: (exercise: Exercise) => void;
}

// Buscador del catálogo: filtra por nombre o grupo muscular y agrega el
// ejercicio elegido al final de la rutina.
export function ExercisePicker({ exercises, isLoading, isError, onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const [creating, setCreating] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    const all = exercises ?? [];
    const matches = needle
      ? all.filter((e) => normalize(`${e.name} ${muscleGroupLabel(e.muscleGroup)}`).includes(needle))
      : all;
    return matches.slice(0, MAX_RESULTS);
  }, [exercises, query]);

  function pick(exercise: Exercise) {
    onPick(exercise);
    setQuery("");
  }

  return (
    <div className="rt-add">
      <label className="rt-label" htmlFor={inputId} style={{ margin: 0 }}>
        Agregar ejercicio
      </label>
      <input
        id={inputId}
        className="rt-input"
        type="search"
        autoComplete="off"
        placeholder="Busca por nombre o grupo muscular"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (results[0]) pick(results[0]);
          }
        }}
      />
      {isLoading && <p className="rt-no-results">Cargando ejercicios…</p>}
      {isError && <p className="rt-no-results">No se pudo cargar el catálogo de ejercicios.</p>}
      {!isLoading && !isError && results.length === 0 && query.trim() && creating === null && (
        <ul className="rt-results">
          <li>
            <button type="button" className="rt-pick rt-pick-create" onClick={() => setCreating(query.trim())}>
              <span aria-hidden="true" className="rt-create-plus">
                +
              </span>
              <span>Crear «{query.trim()}»</span>
            </button>
          </li>
        </ul>
      )}
      {creating !== null && (
        <ExerciseFormCard
          editing={null}
          initialName={creating}
          compact
          submitLabel="Crear y agregar a la rutina"
          onClose={() => setCreating(null)}
          onSaved={(exercise) => {
            setCreating(null);
            pick(exercise);
          }}
        />
      )}
      {results.length > 0 && (
        <ul className="rt-results">
          {results.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" className="rt-pick" onClick={() => pick(exercise)}>
                <span>{exercise.name}</span>
                <span className="rt-chip">{muscleGroupLabel(exercise.muscleGroup)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
