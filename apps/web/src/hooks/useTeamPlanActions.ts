import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as teamCyclesApi from "../services/teamCyclesApi";
import { ApiError } from "../services/httpClient";
import { savedMessage } from "../lib/teamCycle";
import { undoStructure } from "../lib/teamPanel";
import { athletesCount } from "../lib/teams";
import { dayOfMonth, weekdayName } from "../lib/weekCalendar";
import type { BoardToast, SaveStatus } from "./useBoardActions";
import type { SessionStructureInput } from "@cycles/shared";

type TeamSession = teamCyclesApi.TeamSession;

const TOAST_MS = 8_000;
export const dayText = (iso: string) => `${weekdayName(iso)} ${dayOfMonth(iso)}`;

// Los gestos sobre el plan del equipo, iguales en la pizarra de Ciclos y en el Calendario: cada
// uno se guarda solo, llega a los integrantes y avisa qué pasó, con Deshacer cuando se puede.
export function useTeamPlanActions(today: string) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [toast, setToast] = useState<BoardToast | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function announce(next: BoardToast | null) {
    window.clearTimeout(timer.current);
    setToast(next);
    if (next) timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }

  // Un gesto: se guarda, se vuelve a leer el plan y las fichas, y se avisa qué pasó.
  async function perform<T>(request: () => Promise<T>, done: (result: T) => BoardToast | null, fallback: string) {
    setFailure(null);
    setBusy(true);
    setStatus("saving");
    announce(null);
    try {
      const result = await request();
      setStatus("saved");
      announce(done(result));
    } catch (error) {
      setStatus("error");
      setFailure(error instanceof ApiError ? error.message : fallback);
    } finally {
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["team-cycles"] });
      void queryClient.invalidateQueries({ queryKey: ["cycles"] });
      // Las sesiones de cada atleta (calendario del equipo y fichas).
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    }
  }

  const undoCreated = (sessionId: string) => () =>
    void perform(() => teamCyclesApi.deleteTeamSession(sessionId, today), () => ({ message: "Se deshizo el cambio." }), "No se pudo deshacer.");

  function add(cycleId: string, routine: { id: string; name: string }, iso: string) {
    void perform(
      () => teamCyclesApi.addTeamSession(cycleId, { routineId: routine.id, scheduledDate: iso, today }),
      (r) => ({ message: `«${routine.name}» agregada el ${dayText(iso)}: llega a ${athletesCount(r.delivered)}.`, undo: undoCreated(r.sessionId) }),
      "No se pudo agregar la rutina.",
    );
  }

  function move(session: TeamSession, iso: string) {
    const origin = session.scheduledDate.slice(0, 10);
    void perform(
      () => teamCyclesApi.moveTeamSession(session.id, { scheduledDate: iso, today }),
      (summary) => ({
        message: savedMessage(summary),
        undo:
          origin >= today
            ? () => void perform(() => teamCyclesApi.moveTeamSession(session.id, { scheduledDate: origin, today }), (s) => ({ message: savedMessage(s) }), "No se pudo deshacer.")
            : undefined,
      }),
      "No se pudo mover la sesión.",
    );
  }

  function duplicate(session: TeamSession, iso: string) {
    void perform(
      () => teamCyclesApi.duplicateTeamSession(session.id, { scheduledDate: iso, today }),
      (r) => ({ message: `«${session.name}» duplicada el ${dayText(iso)}: llega a ${athletesCount(r.delivered)}.`, undo: undoCreated(r.sessionId) }),
      "No se pudo duplicar la sesión.",
    );
  }

  function saveStructure(sessionId: string, next: SessionStructureInput, previous: SessionStructureInput) {
    void perform(
      () => teamCyclesApi.saveTeamSessionStructure(sessionId, next, today),
      (summary) => ({
        message: savedMessage(summary),
        // Lo que este guardado quitó se vuelve a crear: sus ids ya no existen.
        undo: () => void perform(() => teamCyclesApi.saveTeamSessionStructure(sessionId, undoStructure(previous, next), today), (s) => ({ message: savedMessage(s) }), "No se pudo deshacer."),
      }),
      "No se pudo guardar la sesión.",
    );
  }

  function remove(session: TeamSession) {
    void perform(() => teamCyclesApi.deleteTeamSession(session.id, today), (summary) => ({ message: savedMessage(summary, "quitada") }), "No se pudo quitar la sesión.");
  }

  return { status, toast, failure, busy, announce, clearFailure: () => setFailure(null), add, move, duplicate, saveStructure, remove };
}

export type TeamPlanActions = ReturnType<typeof useTeamPlanActions>;
