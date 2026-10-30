import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Exercise, MuscleGroup } from "@cycles/shared";
import { ExerciseFormCard } from "../components/ExerciseForm";
import * as exercisesApi from "../services/exercisesApi";
import { ApiError } from "../services/httpClient";
import { useAuth } from "../hooks/useAuth";
import { usePageBackground } from "../hooks/usePageBackground";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { MUSCLE_GROUP_LABEL, muscleGroupLabel } from "../lib/muscleGroups";
import { EQUIPMENT_LABEL, GROUP_OPTIONS, visibleExercises, type ExerciseTab } from "../lib/exercises";

function ExerciseRow({
  exercise,
  mine,
  isNew,
  confirming,
  busy,
  onEdit,
  onAskStop,
  onCancelStop,
  onStop,
}: {
  exercise: Exercise;
  mine: boolean;
  isNew: boolean;
  confirming: boolean;
  busy: boolean;
  onEdit: () => void;
  onAskStop: () => void;
  onCancelStop: () => void;
  onStop: () => void;
}) {
  return (
    <li className={isNew ? "ex-row ex-row-new" : "ex-row"}>
      <div className="ex-main">
        <div className="ex-name">
          <h2>{exercise.name}</h2>
          {isNew && <span className="pill pill-blue">Nuevo</span>}
        </div>
        <div className="ex-tags">
          <span className="pill">{muscleGroupLabel(exercise.muscleGroup)}</span>
          {(exercise.equipment ?? []).map((item) => (
            <span key={item} className="pill pill-blue">
              {EQUIPMENT_LABEL[item]}
            </span>
          ))}
        </div>
        {confirming && (
          <p className="ex-confirm-text">
            <strong>¿Dejar de usar «{exercise.name}»?</strong> Ya no aparecerá al armar rutinas. Las sesiones donde lo usaste lo
            conservan.
          </p>
        )}
      </div>
      {mine && (
        <div className="ex-row-actions">
          {confirming ? (
            <>
              <button type="button" className="rt-ghost rt-ghost-danger" disabled={busy} onClick={onStop}>
                Dejar de usar
              </button>
              <button type="button" className="rt-ghost" onClick={onCancelStop}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" className="rt-ghost" onClick={onEdit}>
                Editar
              </button>
              <button type="button" className="rt-ghost" onClick={onAskStop}>
                Dejar de usar
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

// Pestaña Ejercicios del coach: los que creó («Míos») y el catálogo de Cycles
// (solo lectura). Diseño en docs/diseno/crear-ejercicio.
export function ExercisesPage() {
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const queryClient = useQueryClient();
  usePageBackground();

  const [tab, setTab] = useState<ExerciseTab>("mine");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const query = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises, enabled: isCoach });

  const stop = useMutation({
    mutationFn: (id: string) => exercisesApi.deactivateExercise(id),
    onSuccess: () => {
      setConfirmingId(null);
      setStopError(null);
      setStatus("Dejaste de usar el ejercicio.");
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (error: unknown) => {
      setConfirmingId(null);
      setStopError(error instanceof ApiError ? error.message : "No se pudo dejar de usar el ejercicio.");
    },
  });

  const all = query.data ?? [];
  const mineCount = useMemo(() => all.filter((e) => e.createdBy === user?.id).length, [all, user?.id]);
  const catalogCount = all.length - mineCount;
  const visible = useMemo(() => visibleExercises(all, user?.id, tab, group, search), [all, user?.id, tab, group, search]);

  if (!isCoach) return <Navigate to="/" replace />;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
    setStatus(null);
    setTab("mine");
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise);
    setFormOpen(true);
    setStatus(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    newButtonRef.current?.focus();
  }

  function saved(exercise: Exercise, wasEdit: boolean) {
    setNewId(wasEdit ? null : exercise.id);
    setStatus(wasEdit ? "Cambios guardados." : "Ejercicio guardado.");
    setSearch("");
    setGroup("all");
    closeForm();
  }

  const loading = query.isLoading;
  const failed = query.isError;
  const noneMine = !loading && !failed && tab === "mine" && mineCount === 0;

  return (
    <div className="stack ex-page">
      <div className="page-header">
        <h1 className="page-title">Ejercicios</h1>
        <button ref={newButtonRef} type="button" className="button-primary rt-cta" onClick={openCreate}>
          Nuevo ejercicio
        </button>
      </div>

      {status && (
        <div className="ex-notice ex-notice-ok" role="status">
          {status}
        </div>
      )}
      {stopError && (
        <div className="error-banner" role="alert">
          {stopError}
        </div>
      )}

      {formOpen && <ExerciseFormCard key={editing?.id ?? "new"} editing={editing} onClose={closeForm} onSaved={saved} />}

      {failed && (
        <div className="error-banner lb-error" role="alert">
          <span>No se pudieron cargar los ejercicios.</span>
          <button type="button" className="button-secondary" style={{ width: "auto" }} onClick={() => query.refetch()}>
            Reintentar
          </button>
        </div>
      )}

      {!failed && (
        <div className="ex-tabs" role="tablist" aria-label="Ejercicios">
          <button type="button" role="tab" aria-selected={tab === "mine"} className="ex-tab" onClick={() => setTab("mine")}>
            Míos <em>{loading ? "…" : mineCount}</em>
          </button>
          <button type="button" role="tab" aria-selected={tab === "catalog"} className="ex-tab" onClick={() => setTab("catalog")}>
            Catálogo <em>{loading ? "…" : catalogCount}</em>
          </button>
        </div>
      )}

      {tab === "catalog" && !failed && (
        <p className="ex-note">El catálogo de Cycles es de todos y no se edita. Si falta un ejercicio, créalo en «Míos».</p>
      )}

      {noneMine && !formOpen && (
        <EmptyState
          title="Todavía no creaste ejercicios"
          action={
            <button type="button" className="button-primary rt-cta" onClick={openCreate}>
              Nuevo ejercicio
            </button>
          }
        >
          Aquí van los que crees tú. El catálogo de Cycles ya tiene {catalogCount} para empezar.
        </EmptyState>
      )}

      {!failed && !noneMine && (
        <div className="at-toolbar ex-toolbar">
          <div className="ex-groups" role="group" aria-label="Filtrar por grupo muscular">
            <button type="button" className="cb-chip" aria-pressed={group === "all"} onClick={() => setGroup("all")}>
              Todos
            </button>
            {GROUP_OPTIONS.map((g) => (
              <button key={g} type="button" className="cb-chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
                {MUSCLE_GROUP_LABEL[g]}
              </button>
            ))}
          </div>
          <div className="at-search">
            <label htmlFor="exerciseSearch" className="at-sr">
              Buscar ejercicio
            </label>
            <input
              id="exerciseSearch"
              type="search"
              placeholder="Buscar por nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading && (
        <ul className="ex-list" aria-busy="true" aria-label="Cargando ejercicios">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="ex-row">
              <div className="ex-main">
                <Skeleton width="34%" height={18} />
                <Skeleton width="48%" height={14} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !failed && !noneMine && visible.length === 0 && (
        <p className="at-none">No hay ejercicios{search.trim() ? ` para «${search.trim()}»` : " en este grupo"}.</p>
      )}

      {!loading && !failed && visible.length > 0 && (
        <ul className="ex-list">
          {visible.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              mine={tab === "mine"}
              isNew={exercise.id === newId}
              confirming={confirmingId === exercise.id}
              busy={stop.isPending}
              onEdit={() => openEdit(exercise)}
              onAskStop={() => {
                setStopError(null);
                setConfirmingId(exercise.id);
              }}
              onCancelStop={() => setConfirmingId(null)}
              onStop={() => stop.mutate(exercise.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
