import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as teamsApi from "../services/teamsApi";
import * as athletesApi from "../services/athletesApi";
import * as cyclesApi from "../services/cyclesApi";
import { usePageBackground } from "../hooks/usePageBackground";
import { usePageWide } from "../hooks/usePageWide";
import { LoadingScreen } from "../components/LoadingScreen";
import { RowMenu } from "../components/builder/RowMenu";
import { TeamSidebar, type TeamTool } from "../components/teams/TeamSidebar";
import { TeamCalendar } from "../components/teams/TeamCalendar";
import { TeamCycleView } from "../components/teams/cycle/TeamCycleView";
import { NewTeamCycleDialog } from "../components/teams/cycle/NewTeamCycleDialog";
import { JoinTeamCycleDialog, type Joining } from "../components/teams/cycle/JoinTeamCycleDialog";
import * as teamCyclesApi from "../services/teamCyclesApi";
import { defaultTeamCycle } from "../lib/teamCycle";
import { TeamAthletesDialog } from "../components/teams/TeamAthletesDialog";
import { TeamRoutineFlow } from "../components/teams/TeamRoutineFlow";
import { CreateTeamDialog } from "../components/teams/CreateTeamDialog";
import { AddAthletesDialog } from "../components/teams/AddAthletesDialog";
import { RenameTeamDialog } from "../components/teams/RenameTeamDialog";
import { DeleteTeamDialog } from "../components/teams/DeleteTeamDialog";
import { toLocalDay } from "../lib/calendar";
import { athletesCount } from "../lib/teams";

type Dialog = "create" | "athletes" | "add" | "rename" | "delete" | "routine" | "cycle" | "join" | null;

const COLLAPSED_KEY = "cycles.teams.sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

const TOOL_TITLE: Record<TeamTool, string> = { calendario: "Calendario", ciclos: "Ciclos" };

// Pestaña Equipos (CYC-318, docs/diseno/equipos-sidebar): un sidebar con el selector del equipo y
// las herramientas. `/equipos` abre el primer equipo en Calendario.
export function TeamsWorkspace() {
  usePageBackground();
  usePageWide();
  const { id, tool } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const todayIso = toLocalDay(new Date());

  // El sidebar recuerda si quedó contraído.
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* sin almacenamiento: solo dura la visita */
    }
  }, [collapsed]);

  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: teamsApi.listTeams });
  const teams = teamsQuery.data ?? [];
  const known = teams.some((t) => t.id === id);
  const teamQuery = useQuery({ queryKey: ["teams", id], queryFn: () => teamsApi.getTeam(id as string), enabled: !!id && known });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const teamCyclesQuery = useQuery({ queryKey: ["team-cycles", "of", id], queryFn: () => teamCyclesApi.listTeamCycles(id as string), enabled: !!id && known && tool === "ciclos" });
  const [pickedCycle, setPickedCycle] = useState<string | null>(null);
  const [joining, setJoining] = useState<Joining | null>(null);

  if (teamsQuery.isLoading) return <LoadingScreen />;
  if (teamsQuery.isError) return <div className="error-banner">No se pudieron cargar tus equipos.</div>;

  const activeTool: TeamTool = tool === "ciclos" ? "ciclos" : "calendario";
  // «/equipos», un equipo borrado o una herramienta que no existe: al primero, en Calendario.
  if (teams.length > 0 && (!id || !known)) return <Navigate to={`/equipos/${teams[0].id}/calendario`} replace />;
  if (teams.length > 0 && id && tool !== activeTool) return <Navigate to={`/equipos/${id}/${activeTool}`} replace />;
  if (teams.length === 0 && id) return <Navigate to="/equipos" replace />;

  const team = teamQuery.data;
  const teamCycles = teamCyclesQuery.data ?? [];
  const shownCycle = teamCycles.find((c) => c.id === pickedCycle) ?? defaultTeamCycle(teamCycles, todayIso);
  const hasAthletes = (athletesQuery.data ?? []).some((r) => r.status === "active" || r.status === "pending");

  return (
    <div className={collapsed ? "tms-shell tms-shell-col" : "tms-shell"}>
      <TeamSidebar
        teams={teams}
        teamId={id ?? null}
        tool={activeTool}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onPickTeam={(next) => navigate(`/equipos/${next}/${activeTool}`)}
        onCreate={() => setDialog("create")}
      />

      <section className="tms-main">
        {teams.length === 0 ? (
          <>
            <h1 className="tms-title">Equipos</h1>
            <div className="tms-empty">
              <h2>Crea tu primer equipo</h2>
              <p>Agrupa a tus atletas para darles la misma rutina a todos, cada uno con su propio peso.</p>
              {athletesQuery.isLoading ? null : hasAthletes ? (
                <button type="button" className="tms-primary" onClick={() => setDialog("create")}>
                  Crear equipo
                </button>
              ) : (
                <Link className="tms-primary" to="/athletes">
                  Invitar atleta
                </Link>
              )}
            </div>
          </>
        ) : teamQuery.isError ? (
          <div className="error-banner">No se pudo cargar este equipo.</div>
        ) : !team ? (
          <p>Cargando…</p>
        ) : (
          <>
            <header className="tms-head">
              <h1 className="tms-title">{TOOL_TITLE[activeTool]}</h1>
              <div className="tms-head-actions">
                {activeTool === "calendario" ? (
                  <button type="button" className="tms-primary" disabled={team.athletes.length === 0} onClick={() => setDialog("routine")}>
                    Agregar rutina
                  </button>
                ) : (
                  shownCycle && (
                    <button type="button" className="tms-btn" onClick={() => setDialog("cycle")}>
                      Agregar ciclo
                    </button>
                  )
                )}
                <button type="button" className="tms-btn" onClick={() => setDialog("athletes")}>
                  {athletesCount(team.athletes.length)}
                </button>
                <RowMenu
                  label={`Más acciones del equipo ${team.name}`}
                  items={[
                    { label: "Renombrar", onClick: () => setDialog("rename") },
                    { label: "Eliminar equipo", onClick: () => setDialog("delete"), danger: true },
                  ]}
                />
              </div>
            </header>

            {activeTool === "calendario" ? (
              <TeamCalendar key={team.id} athletes={team.athletes} cycles={cyclesQuery.data ?? []} todayIso={todayIso} />
            ) : teamCyclesQuery.isError ? (
              <div className="error-banner">No se pudieron cargar los ciclos del equipo.</div>
            ) : !teamCyclesQuery.data ? (
              <p>Cargando…</p>
            ) : shownCycle ? (
              <TeamCycleView team={team} cycles={teamCycles} cycleId={shownCycle.id} today={todayIso} onPick={setPickedCycle} />
            ) : (
              <div className="tms-empty">
                <h2>Este equipo aún no tiene ciclo</h2>
                <p>Planifica una vez: las sesiones que pongas en el calendario del equipo llegan a cada integrante.</p>
                <button type="button" className="tms-primary" onClick={() => setDialog("cycle")}>
                  Agregar ciclo
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {dialog === "create" && (
        <CreateTeamDialog
          onClose={() => setDialog(null)}
          onCreated={(created) => {
            setDialog(null);
            navigate(`/equipos/${created.id}/calendario`);
          }}
        />
      )}
      {team && dialog === "athletes" && <TeamAthletesDialog team={team} onAdd={() => setDialog("add")} onClose={() => setDialog(null)} />}
      {team && dialog === "add" && (
        <AddAthletesDialog
          team={team}
          onClose={() => setDialog("athletes")}
          onAddedToCycles={(next) => {
            setJoining(next);
            setDialog("join");
          }}
        />
      )}
      {team && dialog === "join" && joining && <JoinTeamCycleDialog team={team} joining={joining} today={todayIso} onClose={() => setDialog(null)} />}
      {team && dialog === "routine" && <TeamRoutineFlow teamId={team.id} onClose={() => setDialog(null)} />}
      {team && dialog === "cycle" && (
        <NewTeamCycleDialog
          team={team}
          existing={teamCycles}
          onClose={() => setDialog(null)}
          onCreated={(created) => {
            setDialog(null);
            setPickedCycle(created.id);
            queryClient.invalidateQueries({ queryKey: ["team-cycles"] });
          }}
        />
      )}
      {team && dialog === "rename" && <RenameTeamDialog team={team} onClose={() => setDialog(null)} />}
      {team && dialog === "delete" && (
        <DeleteTeamDialog
          team={team}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null);
            navigate("/equipos");
          }}
        />
      )}
    </div>
  );
}
