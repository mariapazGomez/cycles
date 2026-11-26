import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as teamsApi from "../../services/teamsApi";
import { athletesCount } from "../../lib/teams";
import { toLocalDay } from "../../lib/calendar";
import * as teamCyclesApi from "../../services/teamCyclesApi";
import { hasImpact, removalLines, sumImpacts } from "../../lib/teamCycle";
import { ImpactList } from "./cycle/ConfirmDialog";

// Eliminar un equipo borra solo el grupo: los atletas siguen en la lista con su ciclo y sus sesiones.
export function DeleteTeamDialog({ team, onClose, onDeleted }: { team: teamsApi.TeamDetail; onClose: () => void; onDeleted: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const today = toLocalDay(new Date());
  // Qué pasa con los ciclos del equipo en las fichas, antes de confirmar.
  const impact = useQuery({
    queryKey: ["teams", team.id, "delete-impact"],
    gcTime: 0,
    queryFn: async () => {
      const cycles = await teamCyclesApi.listTeamCycles(team.id);
      const total = sumImpacts(await Promise.all(cycles.map((c) => teamCyclesApi.teamCycleRemovalImpact(c.id, today))));
      return { names: cycles.map((c) => `«${c.name}»`), total };
    },
  });
  const cycleImpact = impact.data && impact.data.names.length > 0 && hasImpact(impact.data.total) ? impact.data : null;
  const mutation = useMutation({
    mutationFn: () => teamsApi.deleteTeam(team.id, today),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
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
          <div id="tm-del-text">
            <p className="rm-callout">
              {n === 0 ? "El equipo no tiene atletas." : n === 1 ? "El atleta sigue en tu lista, con sus ciclos propios." : `Los ${athletesCount(n)} siguen en tu lista, con sus ciclos propios.`} {cycleImpact ? "" : "Solo se elimina el grupo."}
            </p>
            {cycleImpact && (
              <>
                <p>
                  También se elimina {cycleImpact.names.length === 1 ? "el ciclo del equipo" : "los ciclos del equipo"} {cycleImpact.names.join(" y ")}. En las fichas de quienes {cycleImpact.names.length === 1 ? "lo reciben" : "los reciben"}:
                </p>
                <ImpactList lines={removalLines(cycleImpact.total)} />
              </>
            )}
            {impact.isError && <p className="rm-note">No se pudo calcular qué cambia en las fichas. Intenta de nuevo.</p>}
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="bd-btn tm-danger" data-autofocus disabled={mutation.isPending || !impact.data} onClick={() => { setError(null); mutation.mutate(); }}>
              {mutation.isPending ? "Eliminando…" : "Eliminar equipo"}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
