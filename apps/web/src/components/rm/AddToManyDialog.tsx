import { useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatLoad } from "@cycles/shared";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ApiError } from "../../services/httpClient";
import * as athletesApi from "../../services/athletesApi";
import * as cyclesApi from "../../services/cyclesApi";
import * as rmApi from "../../services/rmApi";
import * as routinesApi from "../../services/routinesApi";
import * as sessionsApi from "../../services/sessionsApi";
import * as teamsApi from "../../services/teamsApi";
import { toLocalDay } from "../../lib/calendar";
import { buildPreview, missingRmCount, whatHappens, type Candidate, type PercentExercise } from "../../lib/addToMany";

type Pick = "all" | "team" | "some";

// «Agregar a varios atletas» (CYC-312): la misma rutina, en una fecha, para varios atletas. Cada
// uno recibe su peso según su RM; a quien le falta se le agrega igual, con el % sin peso, y se
// avisa al coach. Hoy no existen los equipos como grupo con nombre: se elige a los atletas.
export function AddToManyDialog({
  routineId,
  routineName,
  initialTeamId,
  onClose,
}: {
  routineId: string;
  routineName: string;
  // «Agregar rutina al equipo»: abre este mismo flujo con el equipo ya elegido.
  initialTeamId?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const today = toLocalDay(new Date());
  const [date, setDate] = useState(today);
  const [pick, setPick] = useState<Pick>(initialTeamId ? "team" : "all");
  const [teamId, setTeamId] = useState(initialTeamId ?? "");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<sessionsApi.BatchSessionResult[] | null>(null);

  const routineQuery = useQuery({ queryKey: ["routines", routineId], queryFn: () => routinesApi.getRoutine(routineId) });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: teamsApi.listTeams });
  const teams = teamsQuery.data ?? [];
  // Sin vínculo vivo: el equipo se lee ahora, al agregar la rutina.
  const teamQuery = useQuery({ queryKey: ["teams", teamId], queryFn: () => teamsApi.getTeam(teamId), enabled: pick === "team" && teamId !== "" });
  const athletes = useMemo(() => (athletesQuery.data ?? []).filter((r) => r.status === "active").map((r) => r.athlete), [athletesQuery.data]);
  const rmQueries = useQueries({ queries: athletes.map((a) => ({ queryKey: ["rm", a.id], queryFn: () => rmApi.listAthleteRm(a.id) })) });

  const percentExercises: PercentExercise[] = (routineQuery.data?.routineExercises ?? [])
    .filter((re) => re.defaultPercentRm != null)
    .map((re) => ({ exerciseId: re.exerciseId, name: re.exercise.name, percent: re.defaultPercentRm as number }));

  const loading = routineQuery.isLoading || athletesQuery.isLoading || cyclesQuery.isLoading || rmQueries.some((q) => q.isLoading);
  const rmByAthlete = new Map(athletes.map((a, i) => [a.id, new Map((rmQueries[i]?.data?.withMax ?? []).map((m) => [m.exerciseId, m.weightKg]))]));
  const teamMembers = pick === "team" ? (teamQuery.data?.athletes ?? []) : [];
  const candidates: Candidate[] =
    pick === "team"
      ? teamMembers.map((m) => ({ athleteId: m.id, name: m.name, pending: m.status === "pending" }))
      : athletes.map((a) => ({ athleteId: a.id, name: a.name }));
  const rows = buildPreview({
    candidates,
    cycles: cyclesQuery.data ?? [],
    date,
    percentExercises,
    rmByAthlete,
  });
  const selected = rows.filter((r) => (pick === "some" ? chosen.has(r.athleteId) : true));
  const addable = selected.filter((r) => r.cycleId);
  const noCycle = selected.length - addable.length;
  const { missing } = missingRmCount(addable);

  const mutation = useMutation({
    mutationFn: () => sessionsApi.createSessionsBatch({ routineId, cycleIds: addable.map((r) => r.cycleId as string), scheduledDate: date, today }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setOutcome(res.results);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo agregar la rutina."),
  });

  function toggle(id: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (outcome) {
    const failed = outcome.filter((r) => !r.ok);
    const nameOf = (cycleId: string) => rows.find((r) => r.cycleId === cycleId)?.name ?? "Un atleta";
    return (
      <div className="bd-modal-wrap">
        <div className="bd-modal-scrim" onClick={onClose} />
        <div ref={ref} className="bd-modal rm-wide" role="dialog" aria-modal="true" aria-labelledby="rm-many-done">
          <header>
            <h2 id="rm-many-done">
              «{routineName}» agregada a {outcome.length - failed.length} {outcome.length - failed.length === 1 ? "atleta" : "atletas"}
            </h2>
          </header>
          <div className="bd-modal-body">
            {failed.length > 0 && (
              <div className="error-banner" role="alert">
                <b>No se pudo agregar a:</b>
                <ul>
                  {failed.map((r) => (
                    <li key={r.cycleId}>
                      {nameOf(r.cycleId)}: {r.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {missing > 0 && <p className="rm-warn">A quienes les falta RM les quedó el % sin peso. Te dejamos un aviso por atleta para que agregues o calcules su RM.</p>}
            <footer>
              <button type="button" className="bd-btn bd-btn-p" onClick={onClose}>
                Listo
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal rm-wide" role="dialog" aria-modal="true" aria-labelledby="rm-many-title">
        <header>
          <h2 id="rm-many-title">Agregar «{routineName}» a varios atletas</h2>
        </header>
        <div className="bd-modal-body">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div>
            <label className="bd-lbl" htmlFor="rm-many-date">
              Fecha de la sesión
            </label>
            <input id="rm-many-date" type="date" data-autofocus className="bd-inp" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="rm-chips" role="group" aria-label="Atletas">
            <button type="button" className={pick === "all" ? "rm-chip rm-chip-on" : "rm-chip"} aria-pressed={pick === "all"} onClick={() => setPick("all")}>
              Todos mis atletas
            </button>
            {teams.length > 0 && (
              <button
                type="button"
                className={pick === "team" ? "rm-chip rm-chip-on" : "rm-chip"}
                aria-pressed={pick === "team"}
                onClick={() => {
                  setPick("team");
                  if (!teamId) setTeamId(teams[0].id);
                }}
              >
                Equipo{pick === "team" && teamId ? `: ${teams.find((t) => t.id === teamId)?.name ?? ""}` : ""}
              </button>
            )}
            <button type="button" className={pick === "some" ? "rm-chip rm-chip-on" : "rm-chip"} aria-pressed={pick === "some"} onClick={() => setPick("some")}>
              Elegir atletas
            </button>
          </div>
          {pick === "team" && teams.length > 0 && (
            <div>
              <label className="bd-lbl" htmlFor="rm-many-team">
                Equipo
              </label>
              <select id="rm-many-team" className="bd-inp" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.memberCount}
                  </option>
                ))}
              </select>
            </div>
          )}
          {loading || (pick === "team" && teamQuery.isLoading) ? (
            <p>Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="rm-note">Todavía no tienes atletas activos.</p>
          ) : (
            <table className="rm-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Incluir</span>
                  </th>
                  <th scope="col">Atleta</th>
                  <th scope="col">Qué pasa</th>
                  {percentExercises.map((e) => (
                    <th key={e.exerciseId} scope="col">
                      {e.name} {e.percent} %
                    </th>
                  ))}
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const included = pick !== "some" || chosen.has(r.athleteId);
                  return (
                    <tr key={r.athleteId} className={included ? undefined : "rm-off"}>
                      <td>
                        <input type="checkbox" aria-label={`Incluir a ${r.name}`} checked={included} disabled={pick !== "some"} onChange={() => toggle(r.athleteId)} />
                      </td>
                      <td>
                        <b>{r.name}</b>
                      </td>
                      <td>{whatHappens(r).text}</td>
                      {r.cells.map((c) => (
                        <td key={c.exerciseId}>
                          <span className={c.kg != null ? "rm-cell rm-cell-ok" : "rm-cell rm-cell-off"}>{c.kg != null ? formatLoad(c.kg) : "Sin RM"}</span>
                        </td>
                      ))}
                      <td>
                        {r.pending ? (
                          <span className="rm-cell rm-cell-off">Pendiente</span>
                        ) : r.cycleId == null ? (
                          <span className="rm-cell rm-cell-off">Sin ciclo</span>
                        ) : (
                          <span className={r.missingRm ? "rm-cell rm-cell-off" : "rm-cell rm-cell-ok"}>{r.missingRm ? "Falta RM" : "Lista"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {missing > 0 && (
            <p className="rm-warn" role="status">
              <b>
                A {missing} de {addable.length} atletas les falta RM en algún ejercicio.
              </b>{" "}
              Se agrega igual: tendrán el % sin peso y te avisamos para que agregues o calcules su RM.
            </p>
          )}
          {noCycle > 0 && (
            <p className="rm-note">
              {noCycle} {noCycle === 1 ? "atleta no tiene" : "atletas no tienen"} un ciclo que incluya esa fecha: no se {noCycle === 1 ? "le agrega" : "les agrega"} la sesión.
            </p>
          )}
          {percentExercises.length > 0 && <p className="rm-note">Cada atleta recibe la misma rutina con su propio peso. Pesos redondeados a 2,5 kg para que calcen con los discos.</p>}
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="bd-btn bd-btn-p" disabled={mutation.isPending || addable.length === 0 || date === ""} onClick={() => { setError(null); mutation.mutate(); }}>
              {mutation.isPending ? "Agregando…" : `Agregar a ${addable.length} ${addable.length === 1 ? "atleta" : "atletas"}`}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
