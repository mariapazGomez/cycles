import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatLoad } from "@cycles/shared";
import * as exercisesApi from "../../../services/exercisesApi";
import type { TeamCycleDetail, TeamSession } from "../../../services/teamCyclesApi";
import type { TeamPlanActions } from "../../../hooks/useTeamPlanActions";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import { structureOf } from "../../../lib/teamCycle";
import { athletesCount } from "../../../lib/teams";
import { newId } from "../../../lib/uuid";
import type { EditRow } from "../../../lib/teamSessionRows";
import {
  NOTE_MAX,
  buildStructure,
  draftSignature,
  moveRow,
  newRow,
  panelGroups,
  panelRows,
  panelTitle,
  peopleOf,
  reachOf,
  readOnlyReason,
  type Built,
} from "../../../lib/teamPanel";
import { LoadCell } from "../../builder/LoadCell";
import { RowMenu } from "../../builder/RowMenu";
import { ExercisePicker } from "../../ExercisePicker";
import { UndoToast } from "../../board/UndoToast";
import { DotsIcon } from "../../board/icons";
import { ConfirmDialog } from "../cycle/ConfirmDialog";
import { TeamSessionActions, type SessionTarget } from "../cycle/TeamSessionActions";

// Quién abre el panel deja una entrada en el historial, para que «Atrás» lo cierre.
export const PANEL_HISTORY = "teamSessionPanel";
export const pushPanelHistory = () => window.history.pushState({ ...window.history.state, [PANEL_HISTORY]: true }, "");

const MAX_NAMED = 3;

// Panel lateral de una sesión del equipo (docs/diseno/equipos-ancho-completo, parte 3): a quién
// llega un cambio, edición con guardado explícito y deshacer, y solo lectura cuando ya no aplica.
export function TeamSessionPanel({
  cycle,
  session,
  today,
  actions,
  onClosed,
}: {
  cycle: TeamCycleDetail;
  session: TeamSession;
  today: string;
  actions: TeamPlanActions;
  onClosed: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const base = panelRows(session);
  const baseKey = `${session.id}:${draftSignature(base)}`;
  const [draft, setDraft] = useState({ key: baseKey, rows: base });
  const [attempted, setAttempted] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  // Lo que quedó esperando la respuesta a «¿Descartar los cambios?».
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [menu, setMenu] = useState<SessionTarget | null>(null);
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });

  // Al guardar o deshacer llega la versión nueva: el borrador parte de ella.
  if (draft.key !== baseKey) {
    setDraft({ key: baseKey, rows: base });
    setAttempted(false);
  }
  const rows = draft.key === baseKey ? draft.rows : base;
  const setRows = (change: (list: EditRow[]) => EditRow[]) => setDraft((d) => ({ ...d, rows: change(d.rows) }));
  const patch = (key: string, change: Partial<EditRow>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const { reach, excluded } = reachOf(cycle, session);
  const why = readOnlyReason(cycle, session, today, reach);
  const editable = why === null;
  const dirty = editable && draftSignature(rows) !== draftSignature(base);
  const built: Built = buildStructure(session, rows);
  const bad = (set: Set<string>, key: string) => attempted && set.has(key);

  // --- cerrar ---
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const leaving = useRef(false);
  const leave = () => {
    leaving.current = true;
    if (window.history.state?.[PANEL_HISTORY]) window.history.back();
    else onClosed();
  };
  const guard = (action: () => void) => {
    if (dirtyRef.current) setPending(() => action);
    else action();
  };
  const discard = () => {
    setDraft({ key: baseKey, rows: base });
    setAttempted(false);
    dirtyRef.current = false;
  };

  useEffect(() => {
    function onPop() {
      if (leaving.current || !dirtyRef.current) return onClosed();
      // «Atrás» con cambios: el panel se queda y se pregunta.
      pushPanelHistory();
      setPending(() => leave);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useDialogFocus(ref, () => guard(leave));

  function save() {
    setAttempted(true);
    if (!built.input) return;
    setPending(null);
    actions.saveStructure(session.id, built.input, structureOf(session));
  }

  const groups = panelGroups(session, rows);
  const date = panelTitle(session, today);
  const titleId = "tsp-title";
  const named = excluded.length <= MAX_NAMED || showAll;

  return (
    <div className="tsp-wrap">
      <div className="tsp-scrim" onClick={() => guard(leave)} />
      <div ref={ref} className="tsp" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="tsp-head">
          <h2 id={titleId}>{session.name}</h2>
          <span className="tmc-chip">{date}</span>
          <button
            type="button"
            className="bld-icon tsp-more"
            aria-haspopup="dialog"
            aria-expanded={menu !== null}
            aria-label={`Acciones de ${session.name}`}
            disabled={actions.busy || cycle.status !== "active" || today > cycle.endDate.slice(0, 10)}
            onClick={(e) => {
              const anchor = e.currentTarget;
              guard(() => {
                discard();
                setMenu({ cycle, session, anchor });
              });
            }}
          >
            <DotsIcon />
          </button>
          <button type="button" className="bd-btn" data-autofocus onClick={() => guard(leave)}>
            Cerrar
          </button>
        </header>

        <div className="tsp-body">
          {actions.failure && (
            <div className="error-banner" role="alert">
              {actions.failure}{" "}
              <button type="button" className="tour-link" onClick={actions.clearFailure}>
                Entendido
              </button>
            </div>
          )}

          {editable ? (
            <div className="tmc-info">
              <p>
                El cambio llega a <b>{athletesCount(reach)}</b>.
                {excluded.length > MAX_NAMED && (
                  <>
                    {" "}
                    {excluded.length} no cambian.{" "}
                    <button type="button" className="tme-more tsp-who-toggle" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                      {showAll ? "Ocultar" : "Ver quiénes"}
                    </button>
                  </>
                )}
              </p>
              {excluded.length > 0 && named && (
                <ul className="tsp-excluded">
                  {excluded.map((x) => (
                    <li key={x.athleteId}>
                      <b>{x.name}</b> no cambia: {x.reason}.
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="tcx-note">Solo lectura. {why}</p>
          )}

          {rows.length === 0 && <p className="rm-note">{editable ? "Agrega al menos un ejercicio para guardar." : "Esta sesión no tiene ejercicios."}</p>}
          {groups.map((group) => (
            <section key={group.blockId ?? "sueltos"} className="tsp-group" aria-label={group.name ?? "Sin bloque"}>
              {(group.name || groups.length > 1) && <h3>{group.name ?? "Sin bloque"}</h3>}
              <ul>
                {group.rows.map((row, index) => {
                  const load = row.loadMode === "percent" ? (row.percentRm ? `${row.percentRm} % del RM` : "Sin carga") : row.weight ? formatLoad(Number(row.weight.replace(",", "."))) : "Sin carga";
                  const details = open.has(row.key) || bad(built.badRest, row.key);
                  return (
                    <li key={row.key} className="tsp-ex">
                      <div className="tsp-ex-name">
                        <b>{row.name}</b>
                        {editable && !details && row.note.trim() !== "" && <span className="tmc-tag">Con nota</span>}
                        {editable && (
                          <RowMenu
                            label={`Acciones de ${row.name}`}
                            items={[
                              { label: "Descanso y nota", onClick: () => setOpen((s) => new Set(s).add(row.key)) },
                              { label: "Subir", disabled: index === 0, onClick: () => setRows((list) => moveRow(list, row.key, -1)) },
                              { label: "Bajar", disabled: index === group.rows.length - 1, onClick: () => setRows((list) => moveRow(list, row.key, 1)) },
                              { label: "Quitar", danger: true, divider: true, onClick: () => setRows((list) => list.filter((r) => r.key !== row.key)) },
                            ]}
                          />
                        )}
                      </div>
                      {editable ? (
                        <>
                          <div className="tsp-fields">
                            <label>
                              <span>Series</span>
                              <input className={`bd-inp${bad(built.badSets, row.key) ? " bd-inp-bad" : ""}`} inputMode="numeric" aria-label={`Series de ${row.name}`} aria-invalid={bad(built.badSets, row.key)} value={row.sets} onChange={(e) => patch(row.key, { sets: e.target.value })} />
                            </label>
                            <label>
                              <span>Reps</span>
                              <input className={`bd-inp${bad(built.badReps, row.key) ? " bd-inp-bad" : ""}`} inputMode="numeric" aria-label={`Repeticiones de ${row.name}`} aria-invalid={bad(built.badReps, row.key)} value={row.reps} onChange={(e) => patch(row.key, { reps: e.target.value })} />
                            </label>
                            <div className="tsp-load">
                              <span aria-hidden="true">Carga</span>
                              <LoadCell row={row} bad={bad(built.badLoad, row.key)} onChange={(change) => patch(row.key, change)} />
                            </div>
                          </div>
                          {details && (
                            <div className="tsp-extra">
                              <label>
                                <span>Descanso (segundos)</span>
                                <input className={`bd-inp${bad(built.badRest, row.key) ? " bd-inp-bad" : ""}`} inputMode="numeric" aria-label={`Descanso de ${row.name} en segundos`} aria-invalid={bad(built.badRest, row.key)} value={row.restSeconds} onChange={(e) => patch(row.key, { restSeconds: e.target.value })} />
                              </label>
                              <label className="tsp-note">
                                <span>Nota para el atleta</span>
                                <textarea className="bd-inp" rows={2} maxLength={NOTE_MAX} aria-label={`Nota de ${row.name}`} value={row.note} onChange={(e) => patch(row.key, { note: e.target.value })} />
                              </label>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="tsp-read">
                          <p>
                            {row.sets} × {row.reps}, {load.toLowerCase()}
                            {row.restSeconds && `, descanso de ${row.restSeconds} s`}
                          </p>
                          {row.note && <p>{row.note}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {editable && (
            <ExercisePicker
              exercises={exercisesQuery.data}
              isLoading={exercisesQuery.isLoading}
              isError={exercisesQuery.isError}
              onPick={(exercise) => setRows((list) => [...list, newRow(newId(), exercise)])}
            />
          )}

          {!editable && (
            <section className="tsp-group" aria-label="Quién la tiene">
              <h3>Quién la tiene</h3>
              <ul className="tsp-people">
                {peopleOf(cycle, session).map((p) => (
                  <li key={p.athleteId}>
                    <b>{p.name}</b>
                    <span className={p.done ? "tmc-tag tmc-tag-ok" : "tmc-tag"}>{p.state}</span>
                    <Link to={`/sessions/${p.sessionId}`} aria-label={`Ver su sesión: ${p.name}`}>
                      Ver su sesión
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {attempted && !built.input && editable && (
          <p className="bd-hint bd-hint-bad tsp-invalid" role="alert">
            Revisa los campos marcados: series y repeticiones son números enteros, el descanso va en segundos y el % del RM va de 1 a 100.
          </p>
        )}
        <div className="tsp-toast">
          <UndoToast toast={actions.toast} onDismiss={() => actions.announce(null)} />
        </div>
        <footer className="tsp-foot">
          {editable ? (
            <>
              <button type="button" className="bd-btn" disabled={!dirty || actions.busy} onClick={discard}>
                Descartar cambios
              </button>
              <button type="button" className="bd-btn bd-btn-p" disabled={!dirty || actions.busy || rows.length === 0} onClick={save}>
                {actions.busy ? "Guardando…" : `Guardar para ${athletesCount(reach)}`}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="bd-btn bd-btn-p"
              disabled={actions.busy || cycle.status !== "active" || today > cycle.endDate.slice(0, 10)}
              onClick={(e) => setMenu({ cycle, session, anchor: e.currentTarget, start: "duplicate" })}
            >
              Duplicar en otro día…
            </button>
          )}
        </footer>
      </div>

      <TeamSessionActions target={menu} today={today} actions={actions} inPanel onClose={() => setMenu(null)} onRemoved={leave} />
      {pending && (
        <ConfirmDialog
          title="¿Descartar los cambios?"
          confirmLabel="Descartar cambios"
          cancelLabel="Seguir editando"
          busyLabel="Descartando…"
          busy={false}
          error={null}
          onClose={() => setPending(null)}
          onConfirm={() => {
            const next = pending;
            setPending(null);
            discard();
            next();
          }}
        >
          <p>Lo que cambiaste en esta sesión no se ha guardado.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
