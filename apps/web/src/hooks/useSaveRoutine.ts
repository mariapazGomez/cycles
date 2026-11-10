import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import { ApiError } from "../services/httpClient";
import { DRAFT_MESSAGES } from "../lib/routineDraft";
import { track } from "../lib/analytics";

// Crear o actualizar una rutina: refresca la Biblioteca y registra el evento de
// «rutina creada». `via` distingue desde dónde se creó (p. ej. la pizarra).
export function useSaveRoutine({
  routineId,
  via,
  getPayload,
  exerciseCount,
  onSaved,
  onError,
}: {
  routineId: string | null | undefined;
  via?: string;
  getPayload: () => { name: string; exercises: routinesApi.RoutineExerciseInput[] };
  exerciseCount: () => number;
  onSaved: (saved: routinesApi.RoutineDetail, created: boolean) => void;
  onError: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => (routineId ? routinesApi.updateRoutine(routineId, getPayload()) : routinesApi.createRoutine(getPayload())),
    onSuccess: (saved) => {
      if (!routineId) track("routine_created", via ? { exercises: exerciseCount(), via } : { exercises: exerciseCount() });
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      onSaved(saved, !routineId);
    },
    onError: (e: unknown) => onError(e instanceof ApiError ? e.message : DRAFT_MESSAGES.save),
  });
}
