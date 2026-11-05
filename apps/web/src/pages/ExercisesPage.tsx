import { Fragment, Suspense, lazy, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
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
import {
  EQUIPMENT_LABEL,
  GROUP_OPTIONS,
  groupCounts,
  groupsLabel,
  onlySecondary,
  parseZones,
  toggleGroup,
  visibleExercises,
  type ExerciseTab,
} from "../lib/exercises";

// El mapa del cuerpo (dos imágenes y los trazados de las zonas) se carga solo
// cuando se abre esta pestaña.
const BodyFilter = lazy(() => import("../components/BodyFilter").then((m) => ({ default: m.BodyFilter })));

function ExerciseRow({
  exercise,
  mine,
  matching,
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
  // Grupos del filtro: las insignias que coinciden se resaltan.
  matching: MuscleGroup[];
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
          <span className={matching.includes(exercise.muscleGroup ?? "other") ? "pill pill-match" : "pill"}>{muscleGroupLabel(exercise.muscleGroup)}</span>
          {(exercise.secondaryMuscleGroups ?? []).map((item) => (
            <span key={item} className={matching.includes(item) ? "pill pill-soft pill-match" : "pill pill-soft"}>
              {muscleGroupLabel(item)}
            </span>
          ))}
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
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const allButtonRef = useRef<HTMLButtonElement>(null);
  // Plegado del mapa en móvil; en tablet y escritorio siempre está a la vista.
  const [mapOpen, setMapOpen] = useState(false);

  // Las zonas elegidas viven en la dirección (?zonas=chest,core): se conservan
  // al recargar y se pueden compartir.
  const [params, setParams] = useSearchParams();
  const groups = useMemo(() => parseZones(params.get("zonas")), [params]);
  function setGroups(next: MuscleGroup[]) {
    const nextParams = new URLSearchParams(params);
    if (next.length > 0) nextParams.set("zonas", next.join(","));
    else nextParams.delete("zonas");
    setParams(nextParams, { replace: true });
  }
  function clearGroups() {
    setGroups([]);
    allButtonRef.current?.focus();
  }

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

  const all = useMemo(() => query.data ?? [], [query.data]);
  const mineCount = useMemo(() => all.filter((e) => e.createdBy === user?.id).length, [all, user?.id]);
  const catalogCount = all.length - mineCount;
  const visible = useMemo(() => visibleExercises(all, user?.id, tab, groups, search), [all, user?.id, tab, groups, search]);
  const counts = useMemo(() => groupCounts(all, user?.id, tab, search), [all, user?.id, tab, search]);

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
    setGroups([]);
    closeForm();
  }

  const loading = query.isLoading;
  const failed = query.isError;
  const noneMine = !loading && !failed && tab === "mine" && mineCount === 0;

  return (
    <div className={!failed && !noneMine ? "stack ex-page ex-page-map" : "stack ex-page"}>
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
        <div className="ex-layout">
          <div className="at-toolbar ex-toolbar ex-area-toolbar">
            <div className="ex-groups" role="group" aria-label="Filtrar por grupo muscular">
              <button ref={allButtonRef} type="button" className="cb-chip" aria-pressed={groups.length === 0} onClick={() => setGroups([])}>
                Todos
              </button>
              {GROUP_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className="cb-chip"
                  aria-pressed={groups.includes(g)}
                  aria-label={`${MUSCLE_GROUP_LABEL[g]}, ${counts[g]} ${counts[g] === 1 ? "ejercicio" : "ejercicios"}`}
                  disabled={!loading && counts[g] === 0 && !groups.includes(g)}
                  onClick={() => setGroups(toggleGroup(groups, g))}
                >
                  {MUSCLE_GROUP_LABEL[g]}
                  {!loading && <em className="at-count">{counts[g]}</em>}
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

          <aside className={mapOpen ? "ex-map ex-map-open" : "ex-map"} aria-label="Mapa del cuerpo">
            <button
              type="button"
              className="cb-chip exmap-toggle"
              aria-expanded={mapOpen}
              aria-controls="exmap-body"
              onClick={() => setMapOpen((open) => !open)}
            >
              Mapa del cuerpo{groups.length > 0 ? ` · ${groups.length}` : ""}
            </button>
            <div className="exmap-body" id="exmap-body">
              <div className="exmap-head">
                <h2>Mapa del cuerpo</h2>
                {groups.length > 0 && (
                  <button type="button" className="tour-link" onClick={clearGroups}>
                    Limpiar
                  </button>
                )}
              </div>
              <Suspense fallback={<div className="exmap-loading" aria-hidden="true" />}>
                <BodyFilter selected={groups} counts={counts} disabled={loading} onToggle={(g) => setGroups(toggleGroup(groups, g))} />
              </Suspense>
              {groups.length === 0 ? (
                <p className="exmap-hint">Toca una zona para filtrar.</p>
              ) : (
                <ul className="exmap-tags">
                  {groups.map((g) => (
                    <li key={g}>
                      <button type="button" className="exmap-tag" aria-label={`Quitar ${MUSCLE_GROUP_LABEL[g]}`} onClick={() => setGroups(groups.filter((x) => x !== g))}>
                        {MUSCLE_GROUP_LABEL[g]} ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="ex-area-list">
            {!loading && (
              <p className="ex-count" aria-live="polite">
                {visible.length} {visible.length === 1 ? "ejercicio" : "ejercicios"}
                {groups.length > 0 ? ` en ${groupsLabel(groups)}` : ""}
              </p>
            )}

            {loading && (
              <ul className="ex-list" aria-busy="true" aria-label="Cargando ejercicios">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="ex-row">
                    <div className="ex-main">
                      <Skeleton width="34%" height={18} />
                      <Skeleton width="48%" height={14} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!loading && visible.length === 0 && groups.length > 0 && (
              <div className="ex-empty-filter" role="status">
                <p>
                  <strong>
                    Ningún ejercicio trabaja {groupsLabel(groups)}
                    {search.trim() ? ` con «${search.trim()}»` : ""}.
                  </strong>
                </p>
                {tab === "mine" && <p>Prueba con otra zona, o mira el Catálogo.</p>}
                <button type="button" className="button-secondary" style={{ width: "auto" }} onClick={() => { setGroups([]); setSearch(""); }}>
                  Limpiar filtros
                </button>
              </div>
            )}

            {!loading && visible.length === 0 && groups.length === 0 && (
              <p className="at-none">No hay ejercicios{search.trim() ? ` para «${search.trim()}»` : ""}.</p>
            )}

            {!loading && visible.length > 0 && (
              <ul className="ex-list">
                {visible.map((exercise, i) => (
                  <Fragment key={exercise.id}>
                    {onlySecondary(exercise, groups) && (i === 0 || !onlySecondary(visible[i - 1], groups)) && (
                      <li className="ex-sub" role="presentation">
                        <h3>También trabajan {groups.length === 1 ? "esta zona" : "estas zonas"}</h3>
                      </li>
                    )}
                    <ExerciseRow
                      exercise={exercise}
                      mine={tab === "mine"}
                      matching={groups}
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
                  </Fragment>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
