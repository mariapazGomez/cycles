import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as teamCyclesApi from "../../../services/teamCyclesApi";
import type { TeamDetail } from "../../../services/teamsApi";
import { ApiError } from "../../../services/httpClient";
import { cyclePhase, memberRows, PHASE_LABEL } from "../../../lib/teamCycle";
import { initialsOf } from "../../../lib/teams";
import { shortDate } from "../../../lib/weekCalendar";
import { TeamBoard } from "./TeamBoard";
import { TeamCycleEditDialog } from "./TeamCycleEditDialog";

// Equipos → Ciclos: la pizarra del ciclo del equipo y, debajo, quién lo recibe.
export function TeamCycleView({
  team,
  cycles,
  cycleId,
  today,
  onPick,
}: {
  team: TeamDetail;
  cycles: teamCyclesApi.TeamCycleSummary[];
  cycleId: string;
  today: string;
  onPick: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const detail = useQuery({ queryKey: ["team-cycles", cycleId], queryFn: () => teamCyclesApi.getTeamCycle(cycleId) });
  const cycle = detail.data;
  const preview = useQuery({
    queryKey: ["teams", team.id, "cycle-preview", cycle?.startDate, cycle?.endDate],
    queryFn: () => teamCyclesApi.previewTeamCycle(team.id, { startDate: cycle!.startDate, endDate: cycle!.endDate, today }),
    enabled: !!cycle,
  });
  // La copia del propio ciclo del equipo no cuenta como «otro ciclo».
  const ownMembers = (preview.data?.members ?? []).map((m) => ({
    ...m,
    ownCycles: m.ownCycles.filter((o) => !cycle?.athletes.some((a) => a.cycleId === o.id)),
  }));
  const [assignError, setAssignError] = useState<string | null>(null);
  const assign = useMutation({
    mutationFn: (athleteId: string) => teamCyclesApi.joinTeamCycle(cycleId, [athleteId], today),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-cycles", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
    },
    onError: (e: unknown) => setAssignError(e instanceof ApiError ? e.message : "No se pudo asignar el ciclo."),
  });

  if (detail.isError) return <div className="error-banner">No se pudo cargar el ciclo del equipo.</div>;
  if (!cycle) return <p>Cargando…</p>;
  const rows = memberRows(team.athletes, cycle, ownMembers, today);
  const receiving = rows.filter((r) => r.receives).length;
  const phase = cyclePhase(cycle, today);
  const start = cycle.startDate.slice(0, 10);
  const end = cycle.endDate.slice(0, 10);

  return (
    <>
      <TeamBoard
        key={cycle.id}
        cycle={cycle}
        today={today}
        header={(saving) => (
          <div className="tmc-head">
            {cycles.length > 1 ? (
              <select className="tmc-pick" aria-label="Ciclo del equipo" value={cycle.id} onChange={(e) => onPick(e.target.value)}>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({shortDate(c.startDate.slice(0, 10))} – {shortDate(c.endDate.slice(0, 10))})
                  </option>
                ))}
              </select>
            ) : (
              <h2>{cycle.name}</h2>
            )}
            <span className={`tmc-chip${phase === "current" ? " tmc-chip-blue" : ""}`}>{PHASE_LABEL[phase]}</span>
            <span className="tmc-chip">
              {shortDate(start)} – {shortDate(end)} {end.slice(0, 4)}
            </span>
            <span className="tmc-chip">
              {receiving} de {rows.length} atletas
            </span>
            <span className="tmc-grow" />
            {saving}
            <button type="button" className="tms-btn" onClick={() => setEditing(true)}>
              Datos del ciclo
            </button>
            {cycle.objective && <p className="tmc-objective">{cycle.objective}</p>}
          </div>
        )}
      />

      <h2 className="tmc-section">Quién lo recibe</h2>
      {assignError && (
        <div className="error-banner" role="alert">
          {assignError}
        </div>
      )}
      <table className="rm-table tmc-members">
        <thead>
          <tr>
            <th scope="col">Atleta</th>
            <th scope="col">Ciclo del equipo</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link className="tm-athlete" to={`/athletes/${row.id}`}>
                  <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                    {initialsOf(row.name)}
                  </span>
                  <span>{row.name}</span>
                </Link>
              </td>
              <td>
                <span className={`tmc-tag${row.receives ? " tmc-tag-ok" : ""}`}>{row.receives ? "Lo recibe" : "No lo recibe"}</span>
              </td>
              <td>
                {row.detail}
                {row.canAssign && (
                  <button
                    type="button"
                    className="cy-link tmc-assign"
                    disabled={assign.isPending}
                    onClick={() => {
                      setAssignError(null);
                      assign.mutate(row.id);
                    }}
                  >
                    Asignar desde hoy
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <TeamCycleEditDialog
          cycle={cycle}
          others={cycles}
          today={today}
          onClose={() => setEditing(false)}
          onDeleted={() => {
            setEditing(false);
            onPick(null);
          }}
        />
      )}
    </>
  );
}
