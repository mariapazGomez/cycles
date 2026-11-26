import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { RankingPeriod } from "@cycles/shared";
import * as teamEventsApi from "../../../services/teamEventsApi";
import { countsLabel, noFiguresLabel, rankOf } from "../../../lib/teamEvents";
import { initialsOf } from "../../../lib/teams";

// Ranking del equipo (CYC-319): atletas por el porcentaje de sesiones completadas sobre las
// asignadas en el período. La cuenta la hace la API (CYC-317).
export function TeamRankingsView({ teamId, memberCount, period }: { teamId: string; memberCount: number; period: RankingPeriod }) {
  const query = useQuery({ queryKey: ["teams", teamId, "rankings", period], queryFn: () => teamEventsApi.getTeamRankings(teamId, period) });

  if (query.isError) return <div className="error-banner">No se pudo cargar el ranking del equipo.</div>;
  if (memberCount === 0) return <p className="rm-note">Este equipo todavía no tiene atletas. Agrégalos desde el botón de atletas.</p>;
  if (!query.data) return <p>Cargando…</p>;
  const rows = query.data.rows;

  return (
    <div className="tme-box">
      <table className="tme-table tme-rank">
        <thead>
          <tr>
            <th scope="col">
              <span aria-hidden="true">#</span>
              <span className="sr-only">Puesto</span>
            </th>
            <th scope="col">Atleta</th>
            <th scope="col" colSpan={2}>
              Sesiones completadas
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.athleteId}>
              <td className="tme-place">{rankOf(rows, i) ?? "—"}</td>
              <th scope="row">
                <Link className="tm-athlete" to={`/athletes/${row.athleteId}`}>
                  <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                    {initialsOf(row.name)}
                  </span>
                  <span>{row.name}</span>
                </Link>
              </th>
              {row.percent === null ? (
                <td className="tme-nofig" colSpan={2}>
                  {noFiguresLabel(row)}
                </td>
              ) : (
                <>
                  <td className="tme-barcell">
                    <div className="tme-bar" aria-hidden="true">
                      <i style={{ width: `${row.percent}%` }} />
                    </div>
                  </td>
                  <td className="tme-percent" title={countsLabel(row)}>
                    {row.percent} %<span className="sr-only">, {countsLabel(row)}</span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
