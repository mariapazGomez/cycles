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
import { hasNoData, readStarted, subscribeStarted, tourIsActive, tourProgress, writeStarted } from "../lib/tour";

// Estado de la guía de primer uso de la coach: lo que se guarda en la cuenta
// (`tourStatus`) y el avance derivado de sus datos.
// `force` pide los datos aunque la guía ya no esté pendiente (panel «Cómo usar Cycles»).
export function useTour(force = false) {
  const { user, refreshCurrentUser } = useAuth();
  const isCoach = user?.role === "coach";
  const pending = isCoach && user?.tourStatus === "pending";
  const load = pending || (isCoach && force);
  const userId = user?.id ?? "";
  const started = useSyncExternalStore(subscribeStarted, () => readStarted(userId));

  // Las mismas consultas del resto de la app, para no pedir nada de más.
  const routines = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines, enabled: load });
  const athletes = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes, enabled: load });
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles, enabled: load });

  // Un ciclo nace activo, así que el paso 4 se cumple cuando algún ciclo de un
  // atleta ya tiene al menos una sesión asignada.
  const athleteCycles = (cycles.data ?? []).filter((c) => c.athleteId && c.status === "active").slice(0, 5);
  const sessionQueries = useQueries({
    queries: athleteCycles.map((cycle) => ({
      queryKey: ["cycle-sessions", cycle.id],
      queryFn: () => sessionsApi.listSessions(cycle.id),
      enabled: load,
    })),
  });
  const ready = routines.isSuccess && athletes.isSuccess && cycles.isSuccess && sessionQueries.every((q) => q.isSuccess);

  const relations = athletes.data ?? [];
  const activeAthletes = relations.filter((r) => r.status === "active");
  const counts = {
    routines: routines.data?.length ?? 0,
    invited: relations.filter((r) => r.status !== "inactive").length,
    activeAthletes: activeAthletes.length,
    activeCycles: sessionQueries.filter((q) => (q.data?.length ?? 0) > 0).length,
  };
  const progress = tourProgress(counts);
  const noData = hasNoData(counts, cycles.data?.length ?? 0);
  const active = ready && tourIsActive({ isCoach, status: user?.tourStatus, started, noData });

  const save = useMutation({
    mutationFn: async (status: TourStatus) => {
      await tourApi.setTourStatus(status);
      await refreshCurrentUser();
    },
  });

  const begin = useCallback(() => {
    if (!userId) return;
    writeStarted(userId, true);
  }, [userId]);

  const finish = useCallback(
    (status: "skipped" | "completed") => {
      track(status === "completed" ? "tour_completed" : "tour_skipped", { step: progress.current ?? 5 });
      return save.mutateAsync(status);
    },
    [save, progress.current],
  );

  // «Volver a ver la guía»: vuelve a «pending» y la deja ya empezada.
  const reopen = useCallback(async () => {
    if (userId) writeStarted(userId, true);
    await save.mutateAsync("pending");
  }, [save, userId]);

  return {
    active,
    started,
    ready,
    progress,
    counts,
    firstActiveAthlete: activeAthletes[0]?.athlete ?? null,
    pendingAthlete: relations.find((r) => r.status === "pending")?.athlete ?? null,
    begin,
    finish,
    reopen,
    saving: save.isPending,
  };
}
