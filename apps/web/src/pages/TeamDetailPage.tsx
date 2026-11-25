import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as teamsApi from "../services/teamsApi";
import { ApiError } from "../services/httpClient";
import { useCoachRoster } from "../hooks/useCoachRoster";
import { usePageBackground } from "../hooks/usePageBackground";
import { LoadingScreen } from "../components/LoadingScreen";
import { RowMenu } from "../components/builder/RowMenu";
import { AddAthletesDialog } from "../components/teams/AddAthletesDialog";
import { RenameTeamDialog } from "../components/teams/RenameTeamDialog";
import { TeamRoutineFlow } from "../components/teams/TeamRoutineFlow";
import { DeleteTeamDialog } from "../components/teams/DeleteTeamDialog";
import { athletesCount, cycleWeekLabel, initialsOf, teamAthleteState, TEAM_STATE_LABEL } from "../lib/teams";

type Dialog = "add" | "rename" | "delete" | "routine" | null;

// Detalle de un equipo: sus atletas con su ciclo y su estado. «Quitar» solo lo saca del equipo:
// sigue en tu lista con su ciclo y sus sesiones.
export function TeamDetailPage() {
  usePageBackground();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const teamQuery = useQuery({ queryKey: ["teams", id], queryFn: () => teamsApi.getTeam(id) });
  const roster = useCoachRoster();

  const removeMutation = useMutation({
    mutationFn: (athleteId: string) => teamsApi.removeTeamMember(id, athleteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo quitar al atleta."),
  });

  if (teamQuery.isLoading) return <LoadingScreen />;
  const team = teamQuery.data;
  if (teamQuery.isError || !team) {
    return (
      <div className="at-page">
        <Link className="rt-back" to="/equipos">
          ‹ Equipos
        </Link>
        <div className="error-banner">No se pudo cargar este equipo.</div>
      </div>
    );
  }
  const rowById = new Map(roster.rows.map((r) => [r.id, r]));

  return (
    <div className="at-page">
      <Link className="rt-back" to="/equipos">
        ‹ Equipos
      </Link>
      <div className="page-header" style={{ marginTop: 8 }}>
        <div className="tm-title">
          <h1 className="page-title">{team.name}</h1>
          <span className="pill">{athletesCount(team.athletes.length)}</span>
        </div>
        <div className="tm-actions">
          <button type="button" className="button-secondary pl-edit" onClick={() => setDialog("add")}>
            Agregar atletas
          </button>
          <button type="button" className="button-primary pl-edit" disabled={team.athletes.length === 0} onClick={() => setDialog("routine")}>
            Agregar rutina al equipo
          </button>
          <RowMenu
            label={`Más acciones del equipo ${team.name}`}
            items={[
              { label: "Renombrar", onClick: () => setDialog("rename") },
              { label: "Eliminar equipo", onClick: () => setDialog("delete"), danger: true },
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {team.athletes.length === 0 ? (
        <section className="tm-empty">
          <h2>Este equipo todavía no tiene atletas</h2>
          <p>Agrega a los atletas que ya tienes. Si falta alguien, invítalo desde Atletas.</p>
          <button type="button" className="button-primary" style={{ width: "auto" }} onClick={() => setDialog("add")}>
            Agregar atletas
          </button>
        </section>
      ) : (
        <table className="rm-table tm-table">
          <thead>
            <tr>
              <th scope="col">Atleta</th>
              <th scope="col">Ciclo</th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {team.athletes.map((a) => {
              const row = rowById.get(a.id);
              const state = teamAthleteState({ relation: a.status, hasCycle: a.currentCycle != null, attentionCount: row?.attention.length ?? 0 });
              return (
                <tr key={a.id}>
                  <td>
                    <Link className="tm-athlete" to={`/athletes/${a.id}`}>
                      <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                        {initialsOf(a.name)}
                      </span>
                      <b>{a.name}</b>
                    </Link>
                  </td>
                  <td>{a.status === "pending" ? "—" : a.currentCycle ? cycleWeekLabel(a.currentCycle, roster.todayIso) : "Sin ciclo"}</td>
                  <td>
                    <span className={`rm-cell tm-state tm-state-${state}`}>{TEAM_STATE_LABEL[state]}</span>
                  </td>
                  <td>
                    <button type="button" className="tm-quit" disabled={removeMutation.isPending} aria-label={`Quitar a ${a.name} del equipo`} onClick={() => { setError(null); removeMutation.mutate(a.id); }}>
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {dialog === "add" && <AddAthletesDialog team={team} onClose={() => setDialog(null)} />}
      {dialog === "routine" && <TeamRoutineFlow teamId={team.id} onClose={() => setDialog(null)} />}
      {dialog === "rename" && <RenameTeamDialog team={team} onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteTeamDialog team={team} onClose={() => setDialog(null)} onDeleted={() => navigate("/equipos")} />}
    </div>
  );
}
