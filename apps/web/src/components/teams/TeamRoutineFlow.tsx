import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import * as routinesApi from "../../services/routinesApi";
import { AddToManyDialog } from "../rm/AddToManyDialog";
import { normalizeText } from "../../lib/teams";

// «Agregar rutina al equipo»: se elige la rutina y se abre el mismo flujo de «Agregar a varios
// atletas», ya con el equipo elegido.
export function TeamRoutineFlow({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

  if (picked) return <AddToManyDialog routineId={picked.id} routineName={picked.name} initialTeamId={teamId} onClose={onClose} />;

  const routines = (routinesQuery.data ?? []).filter((r) => normalizeText(r.name).includes(normalizeText(query.trim())));
  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="tm-routine-title">
        <header>
          <h2 id="tm-routine-title">Elige la rutina</h2>
        </header>
        <div className="bd-modal-body">
          <div>
            <label className="bd-lbl" htmlFor="tm-routine-search">
              Buscar rutina
            </label>
            <input id="tm-routine-search" data-autofocus type="search" className="bd-inp" placeholder="Buscar por nombre" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {routinesQuery.isLoading ? (
            <p>Cargando…</p>
          ) : routinesQuery.isError ? (
            <div className="error-banner">No se pudieron cargar tus rutinas.</div>
          ) : routines.length === 0 ? (
            <p className="rm-note">{(routinesQuery.data ?? []).length === 0 ? "Todavía no tienes rutinas. Crea una en la Biblioteca." : "Ninguna rutina coincide."}</p>
          ) : (
            <ul className="tm-list">
              {routines.map((r) => (
                <li key={r.id} className="tm-row">
                  <button type="button" className="tm-pick" onClick={() => setPicked({ id: r.id, name: r.name })}>
                    <b>{r.name}</b>
                    <span>{r.routineExercises.length} ejercicios</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
