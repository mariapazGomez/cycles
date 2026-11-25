import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as athletesApi from "../../services/athletesApi";
import * as teamsApi from "../../services/teamsApi";
import { AthletePicker } from "./AthletePicker";

// «Agregar atletas» a un equipo: solo aparecen los que aún no están en él.
export function AddAthletesDialog({ team, onClose }: { team: teamsApi.TeamDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const already = new Set(team.athletes.map((a) => a.id));
  const available = (athletesQuery.data ?? []).filter((r) => (r.status === "active" || r.status === "pending") && !already.has(r.athlete.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => teamsApi.addTeamMembers(team.id, [...selected]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      onClose();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo agregar a los atletas."),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="tm-add-title">
        <header>
          <h2 id="tm-add-title">Agregar atletas a {team.name}</h2>
        </header>
        <div className="bd-modal-body">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <AthletePicker athletes={available} selected={selected} onToggle={toggle} excludeTeamId={team.id} />
          <p className="rm-note">Solo aparecen los atletas que aún no están en este equipo. La etiqueta gris muestra en qué otro equipo ya está.</p>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="bd-btn bd-btn-p" disabled={mutation.isPending || selected.size === 0} onClick={() => { setError(null); mutation.mutate(); }}>
              {mutation.isPending ? "Agregando…" : `Agregar ${selected.size} ${selected.size === 1 ? "atleta" : "atletas"}`}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
