import { useQuery } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import { noveltyConditions } from "../lib/novelty";

// Las condiciones de las slides, con las mismas rutinas que ya carga el resto de la app.
export function useNoveltyConditions(enabled: boolean) {
  const routines = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines, enabled });
  return { ready: routines.isSuccess, conditions: noveltyConditions(routines.data) };
}
