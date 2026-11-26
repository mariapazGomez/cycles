import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import { ApiError } from "../../../services/httpClient";
import * as teamCyclesApi from "../../../services/teamCyclesApi";
import { dayName } from "../../../lib/cycleRange";
import { sessionsFromToday } from "../../../lib/teamCycle";
import { initialsOf } from "../../../lib/teams";

export interface Joining {
  athletes: { id: string; name: string }[];
  cycles: { id: string; name: string; startDate: string; endDate: string }[];
}

// Al sumar atletas a un equipo con ciclo en curso o por venir: se pregunta, ciclo por ciclo, si lo
// reciben. Quien lo recibe conserva el inicio del equipo y le llegan las sesiones desde hoy.
export function JoinTeamCycleDialog({ team, joining, today, onClose }: { team: { id: string; name: string }; joining: Joining; today: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const cycle = joining.cycles[index];
  const next = () => (index + 1 < joining.cycles.length ? setIndex(index + 1) : onClose());
  return <JoinStep key={cycle.id} team={team} athletes={joining.athletes} cycle={cycle} today={today} onNext={next} onClose={onClose} />;
}

function JoinStep({
  team,
  athletes,
  cycle,
  today,
  onNext,
  onClose,
}: {
  team: { id: string; name: string };
  athletes: Joining["athletes"];
  cycle: Joining["cycles"][number];
  today: string;
  onNext: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["team-cycles", cycle.id], queryFn: () => teamCyclesApi.getTeamCycle(cycle.id) });
  const preview = useQuery({
    queryKey: ["teams", team.id, "cycle-preview", "join", cycle.id],
    queryFn: () => teamCyclesApi.previewTeamCycle(team.id, { startDate: cycle.startDate, endDate: cycle.endDate, today }),
    gcTime: 0,
  });
  const byId = new Map((preview.data?.members ?? []).map((m) => [m.id, m]));
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const single = athletes.length === 1 ? athletes[0] : null;
  const canReceive = (id: string) => byId.get(id)?.canReceive ?? false;
  const selected = picked ?? new Set(athletes.filter((a) => canReceive(a.id) && (single !== null || (byId.get(a.id)?.ownCycles.length ?? 0) === 0)).map((a) => a.id));

  const join = useMutation({
    mutationFn: () => teamCyclesApi.joinTeamCycle(cycle.id, [...selected], today),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-cycles", cycle.id] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onNext();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo asignar el ciclo."),
  });

  const ready = Boolean(detail.data && preview.data);
  const count = detail.data ? sessionsFromToday(detail.data, today) : 0;
  const started = cycle.startDate.slice(0, 10) <= today;
  const own = single ? (byId.get(single.id)?.ownCycles ?? []) : [];
  const pending = single !== null && ready && !canReceive(single.id);

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal tmc-modal" role="dialog" aria-modal="true" aria-labelledby="tmc-join-title">
        <header>
          <h2 id="tmc-join-title">{single ? `¿Le asignas el ciclo del equipo a ${single.name}?` : `¿Les asignas «${cycle.name}»?`}</h2>
        </header>
        <div className="bd-modal-body">
          {(error || detail.isError || preview.isError) && (
            <div className="error-banner" role="alert">
              {error ?? "No se pudo cargar el ciclo del equipo."}
            </div>
          )}
          {!ready ? (
            <p>Cargando…</p>
          ) : pending ? (
            <p className="tmc-info">{single!.name} todavía no acepta su invitación. Cuando la acepte, puedes asignarle «{cycle.name}» desde Ciclos.</p>
          ) : (
            <>
              <p className="tmc-info">
                «{cycle.name}» {started ? "empezó" : "empieza"} el {dayName(cycle.startDate.slice(0, 10), today)} y sus semanas son las mismas que las del equipo. A quien lo reciba le llegan las sesiones desde hoy: <b>{count === 1 ? "1 sesión" : `${count} sesiones`}</b>.
              </p>
              {single ? (
                own.length > 0 && <p className="cy-warn">Ya tiene el ciclo {own.map((c) => `«${c.name}»`).join(" y ")} en esas fechas. Los dos conviven.</p>
              ) : (
                <ul className="tmc-who">
                  {athletes.map((a) => {
                    const member = byId.get(a.id);
                    return (
                      <li key={a.id}>
                        <label className={canReceive(a.id) ? undefined : "tmc-off"}>
                          <input
                            type="checkbox"
                            checked={selected.has(a.id)}
                            disabled={!canReceive(a.id)}
                            onChange={() => {
                              const copy = new Set(selected);
                              if (copy.has(a.id)) copy.delete(a.id);
                              else copy.add(a.id);
                              setPicked(copy);
                            }}
                          />
                          <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                            {initialsOf(a.name)}
                          </span>
                          <span className="tmc-who-name">{a.name}</span>
                          {!canReceive(a.id) ? (
                            <span className="tmc-tag">Invitación pendiente</span>
                          ) : (
                            member && member.ownCycles.length > 0 && <span className="tmc-tag tmc-tag-warn">Tiene {member.ownCycles.map((c) => `«${c.name}»`).join(" y ")}</span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          <footer>
            <button type="button" className="bd-btn" onClick={onNext}>
              {pending ? "Entendido" : "No por ahora"}
            </button>
            {!pending && (
              <button type="button" className="bd-btn bd-btn-p" data-autofocus disabled={!ready || selected.size === 0 || join.isPending} onClick={() => { setError(null); join.mutate(); }}>
                {join.isPending ? "Asignando…" : "Sí, asignar desde hoy"}
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
