import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionStatus } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import * as exercisesApi from "../services/exercisesApi";
import { ApiError } from "../services/httpClient";
import { useStructureDraft } from "../hooks/useStructureDraft";
import { looseRows } from "../lib/blocksDraft";
import { isSessionLocked, metaChanges, sessionMeta } from "../lib/sessionDraft";
import { BuilderBlocks } from "../components/builder/BuilderBlocks";
import { BuilderSidePanel } from "../components/builder/BuilderSidePanel";

const STATUS_LABEL: Record<SessionStatus, string> = { pending: "Pendiente", completed: "Completada", skipped: "Salteada" };

// La sesión del coach en el constructor por bloques (CYC-275, PR 3): la misma página que la
// rutina, con fecha y estado en el panel. Una sesión ya hecha o con series registradas se abre
// bloqueada y muestra lo que registró el atleta; «Editar» la desbloquea.
export function SessionBuilderPage({ session }: { session: sessionsApi.SessionDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useStructureDraft(null, "session");
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });
  const before = sessionMeta(session);
  const [date, setDate] = useState(before.date);
  const [status, setStatus] = useState<SessionStatus>(before.status);
  const [unlocked, setUnlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const loaded = useRef<sessionsApi.SessionDetail | null>(null);

  // Carga la sesión al abrir y cuando llega una versión nueva sin cambios pendientes.
  useEffect(() => {
    if (loaded.current === session) return;
    if (loaded.current && draft.dirty) return;
    loaded.current = session;
    draft.loadSession(session);
    setDate(before.date);
    setStatus(before.status);
  }, [session]);

  const metaDirty = Object.keys(metaChanges(before, { name: draft.name, date, status })).length > 0;
  const dirty = draft.dirty || metaDirty;
  const locked = isSessionLocked(session) && !unlocked;
  const cycleUrl = `/cycles/${session.cycleId}`;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!draft.undo) return;
    const timer = window.setTimeout(draft.dismissUndo, 9000);
    return () => window.clearTimeout(timer);
  }, [draft.undo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function save() {
    if (!draft.check()) return;
    setSaving(true);
    try {
      await sessionsApi.saveSessionStructure(session.id, draft.sessionPayload());
      const changes = metaChanges(before, { name: draft.name, date, status });
      if (Object.keys(changes).length > 0) await sessionsApi.updateSession(session.id, changes);
      const fresh = await queryClient.fetchQuery({ queryKey: ["sessions", session.id], queryFn: () => sessionsApi.getSession(session.id), staleTime: 0 });
      loaded.current = fresh;
      draft.loadSession(fresh);
      const next = sessionMeta(fresh);
      setDate(next.date);
      setStatus(next.status);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      setNotice("Cambios guardados.");
    } catch (e) {
      draft.setError(e instanceof ApiError ? e.message : "No se pudo guardar la sesión.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await sessionsApi.deleteSession(session.id);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      navigate(cycleUrl);
    } catch (e) {
      setConfirmingDelete(false);
      draft.setError(e instanceof ApiError ? e.message : "No se pudo borrar la sesión.");
    }
  }

  function leave() {
    if (dirty && !confirmingLeave) return setConfirmingLeave(true);
    navigate(cycleUrl);
  }

  const exercises = { data: exercisesQuery.data, isLoading: exercisesQuery.isLoading, isError: exercisesQuery.isError };
  const tracked = (session.sessionExercises ?? []).some((se) => (se.logs?.length ?? 0) > 0);

  return (
    <div className="bld-page">
      <button type="button" className="bld-back" onClick={leave}>
        ← {session.cycle.name}
      </button>
      <h1 className="page-title">{session.name}</h1>

      {notice && (
        <div className="success-banner" role="status">
          {notice}
        </div>
      )}
      {draft.error && (
        <div className="error-banner" role="alert">
          {draft.error}
        </div>
      )}
      {isSessionLocked(session) && (
        <div className="bld-lock">
          <span>
            {locked
              ? tracked || session.status === "completed"
                ? "Esta sesión ya se registró. Lo que hizo el atleta aparece bajo cada ejercicio."
                : "Esta sesión ya no está pendiente."
              : "Estás editando una sesión que el atleta ya registró: sus series se conservan."}
          </span>
          {locked && (
            <button type="button" className="bld-btn" onClick={() => setUnlocked(true)}>
              Editar
            </button>
          )}
        </div>
      )}

      <div className="bld-layout">
        <fieldset className="bld-fieldset" disabled={locked}>
          <BuilderBlocks draft={draft} exercises={exercises} locked={locked} />
        </fieldset>

        <BuilderSidePanel
          name={draft.name}
          onName={draft.setName}
          nameLabel="Nombre de la sesión"
          saveLabel="Guardar cambios"
          footNote="Las series que el atleta registró se conservan. Volumen = series × reps × carga; duración = 40 s de trabajo por serie más el descanso."
          blockCount={draft.structure.blocks.length}
          stats={draft.stats}
          hasLoose={looseRows(draft.structure).length > 0}
          saving={saving}
          locked={locked}
          tour={false}
          confirmingLeave={confirmingLeave}
          onSave={save}
          onGroup={draft.groupLoose}
          onCancel={leave}
          onStay={() => setConfirmingLeave(false)}
          onLeave={() => navigate(cycleUrl)}
          fields={
            <>
              <div className="bld-field" style={{ marginTop: 10 }}>
                <label className="bld-lbl" htmlFor="bld-s-date">
                  Fecha planificada
                </label>
                <input id="bld-s-date" type="date" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="bld-field" style={{ marginTop: 10 }}>
                <label className="bld-lbl" htmlFor="bld-s-status">
                  Estado
                </label>
                <select id="bld-s-status" value={status} disabled={locked} onChange={(e) => setStatus(e.target.value as SessionStatus)}>
                  {(Object.keys(STATUS_LABEL) as SessionStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          }
          extra={
            confirmingDelete ? (
              <div className="bld-leave" role="alert">
                <p>¿Borrar esta sesión?</p>
                <button type="button" className="bld-btn" onClick={() => setConfirmingDelete(false)}>
                  No
                </button>
                <button type="button" className="bld-btn bld-danger" onClick={remove}>
                  Sí, borrar
                </button>
              </div>
            ) : (
              <button type="button" className="bld-btn bld-danger" onClick={() => setConfirmingDelete(true)}>
                Borrar sesión
              </button>
            )
          }
        />
      </div>

      <div className="bld-bar">
        <span>
          {draft.stats.sets} {draft.stats.sets === 1 ? "serie" : "series"}
          {draft.stats.sets > 0 ? ` · ~${draft.stats.durationMinutes} min` : ""}
        </span>
        <button type="button" className="bld-btn bld-primary" disabled={saving || locked} onClick={save}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {draft.undo && (
        <div className="bd-toast" role="status">
          <span>{draft.undo.message}</span>
          <button type="button" onClick={draft.doUndo}>
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}
