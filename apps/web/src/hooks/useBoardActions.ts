import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TrainingSession } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import { ApiError } from "../services/httpClient";
import { canUndoMove, currentDayOf, weekOfDay, type BoardRange } from "../lib/board";
import { dayOfMonth, weekdayName } from "../lib/weekCalendar";
import { newId } from "../lib/uuid";
import { track } from "../lib/analytics";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface BoardToast {
  message: string;
  undo?: () => void;
}

export interface BoardFailure {
  message: string;
  retry: () => void;
}

const TOAST_MS = 6_000;
const SAVED_MS = 3_000;

function dayLabel(iso: string): string {
  return `${weekdayName(iso)} ${dayOfMonth(iso)}`;
}

interface Op {
  // Cambio optimista sobre la lista de sesiones del calendario.
  optimistic?: (list: TrainingSession[]) => TrainingSession[];
  // Sesiones que muestran «guardando» mientras dura la petición.
  savingIds?: string[];
  request: () => Promise<unknown>;
  // Aviso de éxito (con Deshacer si corresponde); recibe lo que devolvió el servidor.
  toast?: (result: unknown) => BoardToast | null;
  fallbackError: string;
}

// Operaciones de la pizarra (agregar, mover, duplicar, quitar): cada gesto se
// guarda al instante con actualización optimista, se revierte si falla y deja un
// aviso con Deshacer por 6 segundos (docs/diseno/ciclos-pizarra).
export function useBoardActions(cycleId: string, range: BoardRange) {
  const queryClient = useQueryClient();
  const key = ["cycles", cycleId, "sessions"];
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [toast, setToast] = useState<BoardToast | null>(null);
  const [failure, setFailure] = useState<BoardFailure | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const inflight = useRef(0);
  const timers = useRef<{ toast?: number; saved?: number }>({});
  const rangeRef = useRef(range);
  rangeRef.current = range;

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.toast);
      window.clearTimeout(timers.current.saved);
    },
    [],
  );

  const showToast = useCallback((next: BoardToast | null) => {
    window.clearTimeout(timers.current.toast);
    setToast(next);
    if (next) timers.current.toast = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const perform = useCallback(
    async (op: Op) => {
      setFailure(null);
      inflight.current += 1;
      setStatus("saving");
      window.clearTimeout(timers.current.saved);
      if (op.savingIds) setSavingIds((prev) => new Set([...prev, ...op.savingIds!]));
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<TrainingSession[]>(key);
      if (op.optimistic) {
        queryClient.setQueryData<TrainingSession[]>(key, (list) => op.optimistic!(list ?? []));
      }
      try {
        const result = await op.request();
        inflight.current -= 1;
        if (inflight.current === 0) {
          setStatus("saved");
          timers.current.saved = window.setTimeout(() => setStatus("idle"), SAVED_MS);
        }
        showToast(op.toast?.(result) ?? null);
      } catch (error) {
        inflight.current -= 1;
        // Se vuelve a lo que había antes del gesto y luego se lee la verdad del servidor.
        if (snapshot) queryClient.setQueryData(key, snapshot);
        setStatus("error");
        setFailure({
          message: error instanceof ApiError ? error.message : op.fallbackError,
          retry: () => void perform(op),
        });
      } finally {
        if (op.savingIds) {
          setSavingIds((prev) => {
            const next = new Set(prev);
            op.savingIds!.forEach((id) => next.delete(id));
            return next;
          });
        }
        void queryClient.invalidateQueries({ queryKey: key });
        void queryClient.invalidateQueries({ queryKey: ["cycles", cycleId, "progress"] });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycleId, queryClient, showToast],
  );

  const removeOp = useCallback(
    (session: Pick<TrainingSession, "id" | "name">, withUndo: boolean): Op => ({
      optimistic: (list) => list.filter((s) => s.id !== session.id),
      request: () => sessionsApi.deleteSession(session.id),
      toast: () =>
        withUndo
          ? {
              message: `«${session.name}» quitada.`,
              undo: () =>
                void perform({
                  request: () => sessionsApi.restoreSession(session.id),
                  fallbackError: "No se pudo restaurar la sesión.",
                }),
            }
          : null,
      fallbackError: "No se pudo quitar la sesión.",
    }),
    [perform],
  );

  const moveOp = useCallback(
    (session: TrainingSession, dayIso: string, withUndo: boolean): Op => {
      const origin = currentDayOf(session);
      return {
        optimistic: (list) =>
          list.map((s) =>
            s.id === session.id
              ? { ...s, scheduledDate: `${dayIso}T00:00:00.000Z`, weekNumber: weekOfDay(rangeRef.current.startDate, dayIso) }
              : s,
          ),
        savingIds: [session.id],
        request: () => sessionsApi.updateSession(session.id, { scheduledDate: dayIso, today: rangeRef.current.today }),
        toast: () =>
          withUndo && canUndoMove(origin, rangeRef.current)
            ? {
                message: `«${session.name}» se movió al ${dayLabel(dayIso)}.`,
                undo: () => void perform(moveOp(session, origin!, false)),
              }
            : { message: `«${session.name}» se movió al ${dayLabel(dayIso)}.` },
        fallbackError: "No se pudo mover la sesión.",
      };
    },
    [perform],
  );

  const addRoutine = useCallback(
    (routine: { id: string; name: string }, dayIso: string) => {
      const tempId = `tmp-${newId()}`;
      track("routine_assigned", { weeks: 1, via: "board" });
      return perform({
        optimistic: (list) => [
          ...list,
          {
            id: tempId,
            cycleId,
            name: routine.name,
            weekNumber: weekOfDay(rangeRef.current.startDate, dayIso),
            slotNumber: 1_000 + list.length,
            scheduledDate: `${dayIso}T00:00:00.000Z`,
            status: "pending",
          },
        ],
        savingIds: [tempId],
        request: () =>
          sessionsApi.createSession(cycleId, { routineId: routine.id, scheduledDate: dayIso, today: rangeRef.current.today }),
        toast: (created) => ({
          message: `«${routine.name}» agregada el ${dayLabel(dayIso)}.`,
          undo: () => void perform(removeOp({ id: (created as { id: string }).id, name: routine.name }, false)),
        }),
        fallbackError: "No se pudo agregar la rutina.",
      });
    },
    [cycleId, perform, removeOp],
  );

  const moveSession = useCallback((session: TrainingSession, dayIso: string) => perform(moveOp(session, dayIso, true)), [perform, moveOp]);

  const duplicateSession = useCallback(
    (session: TrainingSession, dayIso: string) => {
      const tempId = `tmp-${newId()}`;
      return perform({
        optimistic: (list) => [
          ...list,
          { ...session, id: tempId, weekNumber: weekOfDay(rangeRef.current.startDate, dayIso), slotNumber: 1_000 + list.length, scheduledDate: `${dayIso}T00:00:00.000Z`, status: "pending", startedAt: null },
        ],
        savingIds: [tempId],
        request: () => sessionsApi.duplicateSession(session.id, { scheduledDate: dayIso, today: rangeRef.current.today }),
        toast: (created) => ({
          message: `«${session.name}» duplicada el ${dayLabel(dayIso)}.`,
          undo: () => void perform(removeOp({ id: (created as { id: string }).id, name: session.name }, false)),
        }),
        fallbackError: "No se pudo duplicar la sesión.",
      });
    },
    [perform, removeOp],
  );

  const removeSession = useCallback((session: TrainingSession) => perform(removeOp(session, true)), [perform, removeOp]);

  return {
    status,
    toast,
    failure,
    savingIds,
    addRoutine,
    moveSession,
    duplicateSession,
    removeSession,
    dismissToast: () => showToast(null),
    dismissFailure: () => {
      setFailure(null);
      setStatus("idle");
    },
  };
}
