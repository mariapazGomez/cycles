import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as athletesApi from "../../services/athletesApi";
import * as teamsApi from "../../services/teamsApi";
import { AthletePicker } from "./AthletePicker";

// «Crear equipo»: nombre y atletas que ya tienes. Se puede crear sin atletas y sumarlos después.
export function CreateTeamDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (team: teamsApi.TeamDetail) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const athletes = (athletesQuery.data ?? []).filter((r) => r.status === "active" || r.status === "pending");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => teamsApi.createTeam({ name: name.trim(), athleteIds: [...selected] }),
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      onCreated(team);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo crear el equipo."),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nameBad = attempted && name.trim() === "";
  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="tm-create-title">
        <header>
          <h2 id="tm-create-title">Crear equipo</h2>
        </header>
        <form
          className="bd-modal-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setAttempted(true);
            if (name.trim() !== "") mutation.mutate();
          }}
        >
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div>
            <label className="bd-lbl" htmlFor="tm-name">
              Nombre del equipo
            </label>
            <input id="tm-name" data-autofocus className={`bd-inp${nameBad ? " bd-inp-bad" : ""}`} maxLength={60} aria-invalid={nameBad || undefined} value={name} onChange={(e) => setName(e.target.value)} />
            {nameBad && <p className="bd-hint bd-hint-bad">Ponle un nombre al equipo</p>}
          </div>
          <AthletePicker athletes={athletes} selected={selected} onToggle={toggle} />
          <p className="rm-note">Aparecen los atletas que ya tienes. Un atleta puede estar en más de un equipo. Si te falta alguien, invítalo desde Atletas y vuelve aquí.</p>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" disabled={mutation.isPending}>
              {mutation.isPending ? "Creando…" : "Crear equipo"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
