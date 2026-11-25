import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as teamsApi from "../../services/teamsApi";
import { athletesCount } from "../../lib/teams";

// Eliminar un equipo borra solo el grupo: los atletas siguen en la lista con su ciclo y sus sesiones.
export function DeleteTeamDialog({ team, onClose, onDeleted }: { team: teamsApi.TeamDetail; onClose: () => void; onDeleted: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => teamsApi.deleteTeam(team.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      onDeleted();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo eliminar el equipo."),
  });
  const n = team.athletes.length;
  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="alertdialog" aria-modal="true" aria-labelledby="tm-del-title" aria-describedby="tm-del-text">
        <header>
          <h2 id="tm-del-title">Eliminar «{team.name}»</h2>
        </header>
        <div className="bd-modal-body">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <p id="tm-del-text" className="rm-callout">
            {n === 0 ? "El equipo no tiene atletas." : n === 1 ? "El atleta sigue en tu lista, con su ciclo y sus sesiones." : `Los ${athletesCount(n)} siguen en tu lista, con sus ciclos y sesiones.`} Solo se elimina el grupo.
          </p>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="bd-btn tm-danger" data-autofocus disabled={mutation.isPending} onClick={() => { setError(null); mutation.mutate(); }}>
              {mutation.isPending ? "Eliminando…" : "Eliminar equipo"}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
