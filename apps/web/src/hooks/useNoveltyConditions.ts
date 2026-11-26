import { useQuery } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import { conditionsReady, noveltyConditions } from "../lib/novelty";
import { useAuth } from "./useAuth";

// Las condiciones de las slides, con las mismas rutinas que ya carga el resto de la app.
export function useNoveltyConditions(enabled: boolean) {
  const role = useAuth().user?.role;
  // Las rutinas son solo del coach: a un atleta la API le responde 403.
  const routines = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines, enabled: enabled && role === "coach" });
  return { ready: conditionsReady(role, routines.isSuccess), conditions: noveltyConditions(routines.data) };
}
