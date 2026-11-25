import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as teamsApi from "../../services/teamsApi";
import { useCoachRoster } from "../../hooks/useCoachRoster";
import { initialsOf, teamAthleteState, TEAM_STATE_LABEL } from "../../lib/teams";

// El botón «12 atletas»: la lista con su estado en texto, «Quitar» y «Agregar atletas».
// «Quitar» solo lo saca del equipo: sigue en tu lista con su ciclo y sus sesiones.
export function TeamAthletesDialog({ team, onAdd, onClose }: { team: teamsApi.TeamDetail; onAdd: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const roster = useCoachRoster();
  const rowById = new Map(roster.rows.map((r) => [r.id, r]));
  const [error, setError] = useState<string | null>(null);

  const removeMutation = useMutation({
    mutationFn: (athleteId: string) => teamsApi.removeTeamMember(team.id, athleteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo quitar al atleta."),
  });

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="tms-athletes-title">
        <header>
          <h2 id="tms-athletes-title">Atletas de {team.name}</h2>
        </header>
        <div className="bd-modal-body">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {team.athletes.length === 0 ? (
            <p className="rm-note">Todavía no hay atletas en este equipo.</p>
          ) : (
            <ul className="tms-athletes">
              {team.athletes.map((a) => {
                const state = teamAthleteState({ relation: a.status, hasCycle: a.currentCycle != null, attentionCount: rowById.get(a.id)?.attention.length ?? 0 });
                return (
                  <li key={a.id}>
                    <Link className="tm-athlete" to={`/athletes/${a.id}`}>
                      <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                        {initialsOf(a.name)}
                      </span>
                      <span>{a.name}</span>
                    </Link>
                    <span className={`tms-pill tm-state-${state}`}>{TEAM_STATE_LABEL[state]}</span>
                    <button type="button" className="tm-quit" disabled={removeMutation.isPending} aria-label={`Quitar a ${a.name} del equipo`} onClick={() => { setError(null); removeMutation.mutate(a.id); }}>
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="bd-btn bd-btn-p" data-autofocus onClick={onAdd}>
              Agregar atletas
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
