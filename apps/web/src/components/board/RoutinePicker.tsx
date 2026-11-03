import { useMemo, useState } from "react";
import type { RoutineDetail } from "../../services/routinesApi";
import { SearchIcon } from "./icons";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Contenido del popover del «+»: buscador de rutinas; elegir una la agrega a ese día.
export function RoutinePicker({
  routines,
  onPick,
  onCreate,
}: {
  routines: RoutineDetail[] | undefined;
  onPick: (routine: RoutineDetail) => void;
  // Sin rutinas: abre el cajón «Crear rutina» sin salir de la pizarra.
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return (routines ?? []).filter((r) => !needle || normalize(r.name).includes(needle));
  }, [routines, query]);

  if ((routines ?? []).length === 0) {
    return (
      <div className="bd-pop-body" data-tour="routine-picker">
        <p className="bd-hint">
          Todavía no tienes rutinas.{" "}
          <button type="button" className="bd-link" data-tour="picker-create" onClick={onCreate}>
            Crea la primera
          </button>{" "}
          para asignarla aquí.
        </p>
      </div>
    );
  }
  return (
    <div className="bd-pop-body" data-tour="routine-picker">
      <label className="bd-search">
        <SearchIcon />
        <input type="search" placeholder="Buscar rutina" aria-label="Buscar rutina" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {filtered.length === 0 ? (
        <p className="bd-hint">Ninguna rutina coincide.</p>
      ) : (
        <ul className="bd-rlist bd-rlist-pop">
          {filtered.map((routine, i) => (
            <li key={routine.id}>
              <button type="button" className="bd-ritem" data-tour={i === 0 ? "picker-item" : undefined} onClick={() => onPick(routine)}>
                <span className="bd-nm">
                  <b>{routine.name}</b>
                  <small>{routine.routineExercises.length} ejercicios</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
