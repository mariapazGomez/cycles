import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as teamsApi from "../../services/teamsApi";

export function RenameTeamDialog({ team, onClose }: { team: teamsApi.TeamDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const [name, setName] = useState(team.name);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => teamsApi.renameTeam(team.id, name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      onClose();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo renombrar el equipo."),
  });
  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="tm-rename-title">
        <header>
          <h2 id="tm-rename-title">Renombrar equipo</h2>
        </header>
        <form
          className="bd-modal-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (name.trim() === "") return setError("Ponle un nombre al equipo.");
            mutation.mutate();
          }}
        >
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div>
            <label className="bd-lbl" htmlFor="tm-rename">
              Nombre del equipo
            </label>
            <input id="tm-rename" data-autofocus className="bd-inp" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
