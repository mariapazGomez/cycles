import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamEventOccurrence, TrainingCycle } from "@cycles/shared";
import * as teamEventsApi from "../../../services/teamEventsApi";
import type { TeamDetail } from "../../../services/teamsApi";
import { ApiError } from "../../../services/httpClient";
import { useTeamClashes } from "../../../hooks/useTeamClashes";
import { addDays, startOfWeek } from "../../../lib/eventCalendar";
import { clashLine, dayLabel, eventRows, fullDayLabel, hourLabel, typeName, whoLabel, TYPE_COLOR } from "../../../lib/teamEvents";
import { initialOf, initialsOf, teamColor } from "../../../lib/teams";
import { RowMenu } from "../../builder/RowMenu";
import { ConfirmDialog } from "../cycle/ConfirmDialog";
import { TeamEventDialog } from "./TeamEventDialog";

const STACK = 3;

// Eventos de la semana (CYC-319): los del equipo, que el coach edita, y lo que cada atleta agregó
// por su cuenta, de solo lectura y sin sus notas (R7).
export function TeamEventsView({ team, cycles, anchor }: { team: TeamDetail; cycles: TrainingCycle[]; anchor: string }) {
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TeamEventOccurrence | null>(null);
  const [deleting, setDeleting] = useState<TeamEventOccurrence | null>(null);
  const [allClashes, setAllClashes] = useState(false);
  // Un día de margen a cada lado: una actividad del lunes siguiente también choca con el domingo.
  const query = useQuery({ queryKey: ["teams", team.id, "calendar", addDays(from, -1), addDays(to, 1)], queryFn: () => teamEventsApi.getTeamCalendar(team.id, addDays(from, -1), addDays(to, 1)) });
  const clashes = useTeamClashes(team.athletes, cycles, query.data, from, to);

  const remove = useMutation({
    mutationFn: (event: TeamEventOccurrence) => teamEventsApi.deleteTeamEvent(team.id, event.seriesId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teams", team.id, "calendar"] });
      setDeleting(null);
    },
  });

  if (query.isError) return <div className="error-banner">No se pudieron cargar los eventos del equipo.</div>;
  if (!query.data) return <p>Cargando…</p>;

  const rows = eventRows(query.data, from, to);
  const shownClashes = allClashes ? clashes : clashes.slice(0, 1);

  return (
    <>
      {clashes.length > 0 && (
        <div className="tme-clash" role="status">
          <b>Choque de carga:</b>
          <div>
            {shownClashes.map((c) => (
              <p key={c.athleteId}>{clashLine(c.name, c.clashes)}</p>
            ))}
            {clashes.length > 1 && (
              <button type="button" className="tme-more" aria-expanded={allClashes} onClick={() => setAllClashes((v) => !v)}>
                {allClashes ? "Ver menos" : `Ver ${clashes.length - 1} más`}
              </button>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="tms-empty">
          <h2>No hay eventos esta semana</h2>
          <p>Agrega un partido o un viaje una vez para todo el equipo.</p>
        </div>
      ) : (
        <div className="tme-box">
          <table className="tme-table">
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Evento</th>
                <th scope="col">Quiénes</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={row.kind === "team" ? "tme-own" : undefined}>
                  <td className="tme-day">{dayLabel(row.date)}</td>
                  <td>
                    <div className="tme-event">
                      <span className="tme-dot" style={{ background: TYPE_COLOR[row.type], boxShadow: `0 0 0 3px ${TYPE_COLOR[row.type]}33` }} aria-hidden="true" />
                      <div>
                        <b>{row.title}</b>
                        <small>
                          <span className="sr-only">{typeName(row.type)}. </span>
                          {hourLabel(row)}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {row.kind === "team" ? (
                      <span className="tme-who tme-who-team">
                        <span className="tms-badge" style={{ background: teamColor(team.name) }} aria-hidden="true">
                          {initialOf(team.name)}
                        </span>
                        Todo el equipo
                      </span>
                    ) : (
                      <span className="tme-who" title={row.people.map((p) => p.name).join(", ")}>
                        <span className="tme-stack" aria-hidden="true">
                          {row.people.slice(0, STACK).map((p) => (
                            <span key={p.id} className="hm-avatar hm-avatar-sm">
                              {initialsOf(p.name)}
                            </span>
                          ))}
                        </span>
                        <span>{whoLabel(row.people)}</span>
                        {row.people.length > 1 && <span className="sr-only">: {row.people.map((p) => p.name).join(", ")}</span>}
                      </span>
                    )}
                  </td>
                  <td className="tme-actions">
                    {row.kind === "team" && (
                      <RowMenu
                        label={`Más acciones de ${row.title}, ${dayLabel(row.date)}`}
                        items={[
                          { label: "Editar", onClick: () => setEditing(row.event) },
                          {
                            label: "Eliminar",
                            danger: true,
                            onClick: () => {
                              remove.reset();
                              setDeleting(row.event);
                            },
                          },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <TeamEventDialog team={team} editing={editing} initialDate={editing.seriesDate} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Eliminar «${deleting.title}»`}
          confirmLabel="Eliminar evento"
          busyLabel="Eliminando…"
          busy={remove.isPending}
          error={remove.isError ? (remove.error instanceof ApiError ? remove.error.message : "No se pudo eliminar el evento.") : null}
          onConfirm={() => remove.mutate(deleting)}
          onClose={() => setDeleting(null)}
        >
          <p>
            {deleting.repeat
              ? `Es un evento que se repite: se eliminan todas sus fechas, no solo la del ${fullDayLabel(deleting.date).toLowerCase()}.`
              : `Es el evento del ${fullDayLabel(deleting.date).toLowerCase()}.`}{" "}
            Se quita para todo el equipo.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
