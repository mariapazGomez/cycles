import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import * as exercisesApi from "../services/exercisesApi";
import { useStructureDraft } from "../hooks/useStructureDraft";
import { useSaveRoutine } from "../hooks/useSaveRoutine";
import { libraryPath, safeBackPath } from "../lib/library";
import { looseRows } from "../lib/blocksDraft";
import { LoadingScreen } from "../components/LoadingScreen";
import { BlockCard } from "../components/builder/BlockCard";
import { AddBlockBar } from "../components/builder/AddBlockBar";
import { BuilderSidePanel } from "../components/builder/BuilderSidePanel";

// La página del constructor de rutinas por bloques (CYC-275): bloques a la izquierda y un
// panel fijo a la derecha. Es la misma para crear y para editar, y se llega desde la
// Biblioteca y desde la pizarra del ciclo (`?volver=` regresa a donde estabas).
export function RoutineBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const back = safeBackPath(params.get("volver"));
  const fromBoard = back !== null;

  const routineQuery = useQuery({
    queryKey: ["routines", id],
    queryFn: () => routinesApi.getRoutine(id as string),
    enabled: Boolean(id),
  });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });
  const draft = useStructureDraft();
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  useEffect(() => {
    if (routineQuery.data && loadedId !== routineQuery.data.id) {
      setLoadedId(routineQuery.data.id);
      draft.load(routineQuery.data);
    }
  }, [routineQuery.data, loadedId]);

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!draft.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft.dirty]);

  // El aviso de «Deshacer» se va solo.
  useEffect(() => {
    if (!draft.undo) return;
    const timer = window.setTimeout(draft.dismissUndo, 9000);
    return () => window.clearTimeout(timer);
  }, [draft.undo]);

  const exitTo = back ?? libraryPath("routine");

  const saveMutation = useSaveRoutine({
    routineId: id,
    via: fromBoard ? "board" : undefined,
    getPayload: draft.payload,
    exerciseCount: () => draft.structure.rows.length,
    onSaved: (saved, created) => {
      draft.markSaved();
      const notice = created
        ? fromBoard
          ? `«${saved.name}» guardada. Ya está en el panel: arrástrala a un día.`
          : `«${saved.name}» guardada. Ya está en tu biblioteca.`
        : `«${saved.name}» actualizada. Vale para las sesiones que agregues desde ahora.`;
      navigate(exitTo, { state: { notice } });
    },
    onError: draft.setError,
  });

  function save() {
    if (draft.check()) saveMutation.mutate();
  }

  function leave() {
    if (draft.dirty && !confirmingLeave) return setConfirmingLeave(true);
    navigate(exitTo);
  }

  if (id && routineQuery.isLoading) return <LoadingScreen />;
  if (id && routineQuery.isError) {
    return (
      <div className="stack">
        <Link className="rt-back" to={exitTo}>
          ← {fromBoard ? "Volver" : "Biblioteca"}
        </Link>
        <div className="error-banner">No se encontró la rutina.</div>
      </div>
    );
  }

  const blocks = draft.structure.blocks;
  const exercises = { data: exercisesQuery.data, isLoading: exercisesQuery.isLoading, isError: exercisesQuery.isError };
  const actions = {
    addExercise: draft.addExercise,
    updateRow: draft.updateRow,
    duplicateRow: draft.duplicateRow,
    removeRow: draft.removeRow,
    moveRowInBlock: draft.moveRowInBlock,
    canMoveRow: draft.canMoveRow,
    moveRowToBlock: draft.moveRowToBlock,
    updateBlock: draft.updateBlock,
    removeBlock: draft.removeBlock,
    moveBlock: draft.moveBlock,
  };

  return (
    <div className="bld-page" data-tour="drawer" data-from={location.key}>
      <button type="button" className="bld-back" onClick={leave}>
        ← {fromBoard ? "Volver al ciclo" : "Biblioteca"}
      </button>
      <h1 className="page-title">{id ? "Editar rutina" : "Nueva rutina"}</h1>

      {draft.error && (
        <div className="error-banner" role="alert">
          {draft.error}
        </div>
      )}

      <div className="bld-layout">
        <div className="bld-main" data-tour="drawer-exercises">
          {draft.views.length === 0 && <p className="bld-empty">Agrega el primer bloque o un ejercicio para empezar.</p>}
          {draft.views.map((view, index) => (
            <BlockCard
              key={view.block?.key ?? "loose"}
              view={view}
              index={index}
              count={blocks.length}
              blocks={blocks}
              attempted={draft.attempted}
              actions={actions}
              exercises={exercises}
            />
          ))}
          {blocks.length === 0 && draft.structure.rows.length === 0 && (
            <BlockCard
              view={{ block: null, rows: [] }}
              index={0}
              count={0}
              blocks={blocks}
              attempted={draft.attempted}
              actions={actions}
              exercises={exercises}
            />
          )}
          <AddBlockBar count={blocks.length} onAdd={draft.addBlock} />
        </div>

        <BuilderSidePanel
          name={draft.name}
          onName={draft.setName}
          blockCount={blocks.length}
          stats={draft.stats}
          hasLoose={looseRows(draft.structure).length > 0}
          saving={saveMutation.isPending}
          confirmingLeave={confirmingLeave}
          onSave={save}
          onGroup={draft.groupLoose}
          onCancel={leave}
          onStay={() => setConfirmingLeave(false)}
          onLeave={() => navigate(exitTo)}
        />
      </div>

      <div className="bld-bar">
        <span>
          {draft.stats.sets} {draft.stats.sets === 1 ? "serie" : "series"}
          {draft.stats.sets > 0 ? ` · ~${draft.stats.durationMinutes} min` : ""}
        </span>
        <button type="button" className="bld-btn bld-primary" disabled={saveMutation.isPending} onClick={save}>
          {saveMutation.isPending ? "Guardando…" : "Guardar rutina"}
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
