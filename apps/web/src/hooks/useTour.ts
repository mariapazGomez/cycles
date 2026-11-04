import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import type { TourStatus } from "@cycles/shared";
import { useAuth } from "./useAuth";
import * as routinesApi from "../services/routinesApi";
import * as athletesApi from "../services/athletesApi";
import * as cyclesApi from "../services/cyclesApi";
import * as sessionsApi from "../services/sessionsApi";
import * as tourApi from "../services/tourApi";
import { track } from "../lib/analytics";
import { clearLocal, hasNoData, readLocal, subscribeLocal, tourIsActive, tourProgress, writeLocal, type TourStepN } from "../lib/tour";

// Estado de la guía de primer uso de la coach: lo que se guarda en la cuenta
// (`tourStatus`), lo que recuerda el navegador (empezó, pasos saltados) y el
// avance derivado de sus datos.
// `force` pide los datos aunque la guía ya no esté pendiente (panel «Cómo usar Cycles»).
export function useTour(force = false) {
  const { user, refreshCurrentUser } = useAuth();
  const isCoach = user?.role === "coach";
  const pending = isCoach && user?.tourStatus === "pending";
  const load = pending || (isCoach && force);
  const userId = user?.id ?? "";
  const local = useSyncExternalStore(subscribeLocal, () => readLocal(userId));

  // Las mismas consultas del resto de la app, para no pedir nada de más y para
  // que se actualicen solas cuando la coach guarda algo.
  const routines = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines, enabled: load });
  const athletes = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes, enabled: load });
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles, enabled: load });

  // Un ciclo nace activo, así que el paso 5 se cumple cuando algún ciclo de un
  // atleta ya tiene al menos una sesión asignada.
  const athleteCycles = (cycles.data ?? []).filter((c) => c.athleteId);
  const activeAthleteCycles = athleteCycles.filter((c) => c.status === "active").slice(0, 5);
  const sessionQueries = useQueries({
    queries: activeAthleteCycles.map((cycle) => ({
      queryKey: ["cycles", cycle.id, "sessions"],
      queryFn: () => sessionsApi.listSessions(cycle.id),
      enabled: load,
    })),
  });
  const ready = routines.isSuccess && athletes.isSuccess && cycles.isSuccess && sessionQueries.every((q) => q.isSuccess);

  const relations = athletes.data ?? [];
  const activeAthletes = relations.filter((r) => r.status === "active");
  const counts = {
    invited: relations.filter((r) => r.status !== "inactive").length,
    activeAthletes: activeAthletes.length,
    athleteCycles: athleteCycles.length,
    routines: routines.data?.length ?? 0,
    routinesWithExercises: (routines.data ?? []).filter((r) => r.routineExercises.length > 0).length,
    activeCycles: sessionQueries.filter((q) => (q.data?.length ?? 0) > 0).length,
  };
  const progress = tourProgress(counts, local.skipped);
  const noData = hasNoData(counts, cycles.data?.length ?? 0);
  const active = ready && tourIsActive({ isCoach, status: user?.tourStatus, started: local.started, noData });

  const save = useMutation({
    mutationFn: async (status: TourStatus) => {
      await tourApi.setTourStatus(status);
      await refreshCurrentUser();
    },
  });

  const begin = useCallback(() => {
    writeLocal(userId, { started: true, paused: false });
  }, [userId]);

  const finish = useCallback(
    (status: "skipped" | "completed") => {
      track(status === "completed" ? "tour_completed" : "tour_skipped", { step: progress.current ?? 7 });
      return save.mutateAsync(status);
    },
    [save, progress.current],
  );

  // «Volver a ver la guía»: vuelve a «pending» y la deja empezada desde cero.
  const reopen = useCallback(async () => {
    clearLocal(userId);
    writeLocal(userId, { started: true });
    await save.mutateAsync("pending");
  }, [save, userId]);

  const skipStep = useCallback(
    (step: TourStepN) => writeLocal(userId, { skipped: [...local.skipped.filter((n) => n !== step), step] }),
    [userId, local.skipped],
  );
  const unskipLast = useCallback(
    () => writeLocal(userId, { skipped: local.skipped.slice(0, -1) }),
    [userId, local.skipped],
  );
  const markSummarySeen = useCallback(() => writeLocal(userId, { summarySeen: true }), [userId]);
  const setPaused = useCallback((paused: boolean) => writeLocal(userId, { paused }), [userId]);

  return {
    active,
    started: local.started,
    paused: local.paused,
    summarySeen: local.summarySeen,
    skippedCount: local.skipped.length,
    ready,
    progress,
    counts,
    firstActiveAthlete: activeAthletes[0]?.athlete ?? null,
    pendingAthlete: relations.find((r) => r.status === "pending")?.athlete ?? null,
    begin,
    finish,
    reopen,
    skipStep,
    unskipLast,
    markSummarySeen,
    setPaused,
    saving: save.isPending,
  };
}
