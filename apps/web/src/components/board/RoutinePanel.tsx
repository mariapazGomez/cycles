import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { RoutineDetail } from "../../services/routinesApi";
import { GripIcon, SearchIcon } from "./icons";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

interface RoutinePanelProps {
  routines: RoutineDetail[] | undefined;
  isLoading: boolean;
  isError: boolean;
  disabled: boolean;
  draggingId: string | null;
  onRetry: () => void;
  // Elegir una rutina sin arrastrar: abre el selector de día anclado a la fila.
  onActivate: (routine: RoutineDetail, anchor: HTMLElement) => void;
  onDragStart: (routine: RoutineDetail) => void;
  onDragEnd: () => void;
}

// Panel de rutinas (variante A): buscador, lista arrastrable y «Crear rutina nueva».
export function RoutinePanel({ routines, isLoading, isError, disabled, draggingId, onRetry, onActivate, onDragStart, onDragEnd }: RoutinePanelProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return (routines ?? []).filter((r) => !needle || normalize(r.name).includes(needle));
  }, [routines, query]);

  return (
    <>
      <header className="bd-rail-head">
        <h2>Rutinas</h2>
      </header>
      <label className="bd-search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Buscar rutina"
          aria-label="Buscar rutina"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {isLoading ? (
        <p className="bd-hint">Cargando rutinas…</p>
      ) : isError ? (
        <div className="bd-empty">
          <p>No se pudieron cargar las rutinas.</p>
          <button type="button" className="bd-btn" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : (routines ?? []).length === 0 ? (
        <div className="bd-empty">
          <p>Todavía no tienes rutinas. Crea la primera para poder asignarla.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="bd-hint">Ninguna rutina coincide con «{query}».</p>
      ) : (
        <ul className="bd-rlist">
          {filtered.map((routine) => (
            <li key={routine.id}>
              <div
                className={`bd-ritem${draggingId === routine.id ? " bd-ritem-lift" : ""}${disabled ? " bd-ritem-dis" : ""}`}
                draggable={!disabled}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-disabled={disabled}
                aria-label={`${routine.name}: elegir el día para agregarla`}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", routine.name);
                  onDragStart(routine);
                }}
                onDragEnd={onDragEnd}
                onClick={(e) => !disabled && onActivate(routine, e.currentTarget)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onActivate(routine, e.currentTarget);
                  }
                }}
              >
                <span className="bd-grip">
                  <GripIcon />
                </span>
                <span className="bd-nm">
                  <b>{routine.name}</b>
                  <small>
                    {routine.routineExercises.length} {routine.routineExercises.length === 1 ? "ejercicio" : "ejercicios"}
                  </small>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <Link to="/routines/new" className="bd-btn bd-btn-p bd-new">
          Crear rutina nueva
        </Link>
      )}
    </>
  );
}
