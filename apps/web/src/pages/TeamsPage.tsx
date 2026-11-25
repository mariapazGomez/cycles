import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as teamsApi from "../services/teamsApi";
import * as athletesApi from "../services/athletesApi";
import { usePageBackground } from "../hooks/usePageBackground";
import { LoadingScreen } from "../components/LoadingScreen";
import { CreateTeamDialog } from "../components/teams/CreateTeamDialog";
import { TeamAvatars } from "../components/teams/TeamAvatars";
import { athletesCount, initialOf, teamColor } from "../lib/teams";

// Pestaña Equipos (CYC-310, docs/diseno/equipos): una tarjeta por equipo con su nombre, cuántos
// atletas tiene y quiénes son. Los atletas se siguen invitando desde Atletas; aquí solo se agrupan.
export function TeamsPage() {
  usePageBackground();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: teamsApi.listTeams });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });

  if (teamsQuery.isLoading || athletesQuery.isLoading) return <LoadingScreen />;
  if (teamsQuery.isError) return <div className="error-banner">No se pudieron cargar tus equipos.</div>;
  const teams = teamsQuery.data ?? [];
  const hasAthletes = (athletesQuery.data ?? []).some((r) => r.status === "active" || r.status === "pending");

  return (
    <div className="at-page">
      <div className="page-header">
        <h1 className="page-title">Equipos</h1>
        {teams.length > 0 && (
          <button type="button" className="button-primary at-invite-btn" onClick={() => setCreating(true)}>
            Crear equipo
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <section className="tm-empty" aria-label="Equipos">
          <span className="tm-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3" />
              <circle cx="17" cy="9" r="2.2" />
              <path d="M3.5 19c.4-3 2.6-5 5.5-5s5.1 2 5.5 5M15 14.2c.7-.2 1.3-.2 2-.2 2 0 3.3 1.4 3.6 4" />
            </svg>
          </span>
          <h2>Crea tu primer equipo</h2>
          <p>Agrupa a tus atletas para darles la misma rutina a todos, cada uno con su propio peso.</p>
          {hasAthletes ? (
            <button type="button" className="button-primary" style={{ width: "auto" }} onClick={() => setCreating(true)}>
              Crear equipo
            </button>
          ) : (
            <Link className="button-primary" style={{ width: "auto" }} to="/athletes">
              Invitar atleta
            </Link>
          )}
        </section>
      ) : (
        <ul className="at-grid tm-grid">
          {teams.map((team) => (
            <li key={team.id} className="tm-card">
              <Link to={`/equipos/${team.id}`} className="tm-card-link" aria-label={`Abrir el equipo ${team.name}, ${athletesCount(team.memberCount)}`}>
                <div className="tm-card-head">
                  <span className="tm-initial" style={{ background: teamColor(team.name) }} aria-hidden="true">
                    {initialOf(team.name)}
                  </span>
                  <b>{team.name}</b>
                  <span className="tm-card-count">{athletesCount(team.memberCount)}</span>
                </div>
                <TeamAvatars members={team.members} total={team.memberCount} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateTeamDialog onClose={() => setCreating(false)} onCreated={(team) => navigate(`/equipos/${team.id}`)} />}
    </div>
  );
}
