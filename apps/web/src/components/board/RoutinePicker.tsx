import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { RoutineDetail } from "../../services/routinesApi";
import { SearchIcon } from "./icons";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Contenido del popover del «+»: buscador de rutinas; elegir una la agrega a ese día.
export function RoutinePicker({
  routines,
  onPick,
}: {
  routines: RoutineDetail[] | undefined;
  onPick: (routine: RoutineDetail) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return (routines ?? []).filter((r) => !needle || normalize(r.name).includes(needle));
  }, [routines, query]);

  if ((routines ?? []).length === 0) {
    return (
      <div className="bd-pop-body">
        <p className="bd-hint">
          Todavía no tienes rutinas. <Link to="/routines/new">Crea la primera</Link> para asignarla aquí.
        </p>
      </div>
    );
  }
  return (
    <div className="bd-pop-body">
      <label className="bd-search">
        <SearchIcon />
        <input type="search" placeholder="Buscar rutina" aria-label="Buscar rutina" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {filtered.length === 0 ? (
        <p className="bd-hint">Ninguna rutina coincide.</p>
      ) : (
        <ul className="bd-rlist bd-rlist-pop">
          {filtered.map((routine) => (
            <li key={routine.id}>
              <button type="button" className="bd-ritem" onClick={() => onPick(routine)}>
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
