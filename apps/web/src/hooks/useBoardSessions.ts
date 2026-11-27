import { useQuery } from "@tanstack/react-query";
import * as boardApi from "../services/boardApi";
import { addDays } from "../lib/eventCalendar";

// Las sesiones de los atletas del coach (o de un equipo) en un tramo, en una sola consulta. La clave
// empieza con «cycles»: lo que cambia un ciclo también la renueva.
export function useBoardSessions(from: string, to: string, options: { teamId?: string; volumes?: boolean; enabled?: boolean } = {}) {
  const { teamId, volumes = false, enabled = true } = options;
  return useQuery({
    queryKey: ["cycles", "board", teamId ?? "all", from, to, volumes],
    queryFn: () => boardApi.getBoardSessions(from, to, { teamId, volumes }),
    enabled,
    staleTime: 60_000,
  });
}

// Inicio y Atletas comparten este tramo (y por eso la consulta): las cuatro semanas de las tarjetas
// y, por el choque de carga, hasta el lunes siguiente (y el domingo anterior ya queda dentro).
export function useRosterSessions(monday: string, enabled = true) {
  return useBoardSessions(addDays(monday, -21), addDays(monday, 7), { volumes: true, enabled });
}
