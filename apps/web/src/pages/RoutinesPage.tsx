import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import { ApiError } from "../services/httpClient";
import { EmptyState } from "../components/EmptyState";
import { muscleGroupLabel } from "../lib/muscleGroups";
import { formatInteger } from "../lib/format";

function groupsOf(routine: routinesApi.RoutineDetail): string[] {
  return [...new Set(routine.routineExercises.map((re) => muscleGroupLabel(re.exercise.muscleGroup)))];
}

function totalSets(routine: routinesApi.RoutineDetail): number {
  return routine.routineExercises.reduce((sum, re) => sum + re.defaultSets, 0);
}

// Lista de rutinas del coach. Crear y editar viven en RoutineEditorPage.
export function RoutinesPage() {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routinesApi.deleteRoutine(id),
    onSuccess: () => {
      setConfirmingId(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (error: unknown) => {
      setConfirmingId(null);
      setDeleteError(error instanceof ApiError ? error.message : "No se pudo borrar la rutina.");
    },
  });

  const routines = routinesQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-title">Rutinas</h1>
        {routines.length > 0 && (
          <Link className="button-primary rt-cta" to="/routines/new">
            Crear rutina
          </Link>
        )}
      </div>

      {deleteError && (
        <div className="error-banner" role="alert">
          {deleteError}
        </div>
      )}
      {routinesQuery.isLoading && <p>Cargando…</p>}
      {routinesQuery.isError && <div className="error-banner">No se pudieron cargar las rutinas.</div>}

      {routinesQuery.data && routines.length === 0 && (
        <EmptyState
          title="Arma tu primera rutina"
          action={
            <Link className="button-primary rt-cta" to="/routines/new" style={{ marginTop: 16 }}>
              Crear rutina
            </Link>
          }
        >
          Una rutina es una cadena de ejercicios con series, reps y carga. La reutilizas en los planes de tus atletas.
        </EmptyState>
      )}

      {routines.length > 0 && (
        <ul className="rt-list">
          {routines.map((routine) => (
            <li key={routine.id} className="rt-item">
              <div>
                <h2>{routine.name}</h2>
                <div className="rt-item-meta">
                  {groupsOf(routine).map((group) => (
                    <span key={group} className="rt-chip">
                      {group}
                    </span>
                  ))}
                  <span>
                    {formatInteger(routine.routineExercises.length)}{" "}
                    {routine.routineExercises.length === 1 ? "ejercicio" : "ejercicios"}, {formatInteger(totalSets(routine))}{" "}
                    series
                  </span>
                </div>
              </div>
              <div className="rt-item-actions">
                {confirmingId === routine.id ? (
                  <>
                    <span className="rt-hint">¿Borrar esta rutina?</span>
                    <button
                      type="button"
                      className="rt-ghost rt-ghost-danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(routine.id)}
                    >
                      Sí, borrar
                    </button>
                    <button type="button" className="rt-ghost" onClick={() => setConfirmingId(null)}>
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <Link className="rt-ghost" to={`/routines/${routine.id}`}>
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="rt-ghost"
                      onClick={() => {
                        setDeleteError(null);
                        setConfirmingId(routine.id);
                      }}
                    >
                      Borrar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
