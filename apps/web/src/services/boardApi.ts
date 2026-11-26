import type { TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "./cyclesApi";
import * as sessionsApi from "./sessionsApi";
import type { BoardSession } from "../lib/weekBoard";
import { addDays, sessionDayIso, utcDay } from "../lib/weekCalendar";

// Ciclos con sesiones que pueden caer entre `from` y `to`: los activos del atleta
// y, si son macrociclos, los ciclos que contienen.
async function cyclesOfRange(athleteCycles: TrainingCycle[], from: string, to: string): Promise<TrainingCycle[]> {
  const leaves: TrainingCycle[] = [];
  for (const cycle of athleteCycles) {
    if (cycle.status !== "active") continue;
    if (cycle.cycleType === "macrocycle") {
      const children = await cyclesApi.getChildren(cycle.id);
      leaves.push(...children.filter((c) => c.status !== "archived"));
    } else {
      leaves.push(cycle);
    }
  }
  // Los ciclos creados por fechas no tienen «sesiones por semana» (CYC-314): no se filtran por eso.
  return leaves.filter((c) => utcDay(c.startDate) <= utcDay(to) && utcDay(c.endDate) >= utcDay(from));
}

// Sesiones de un atleta entre dos días (incluidos), cada una con su día. La usan la semana
// del Inicio y el calendario del equipo.
export async function loadAthleteSessions(athleteCycles: TrainingCycle[], from: string, to: string): Promise<BoardSession[]> {
  const cycles = await cyclesOfRange(athleteCycles, from, to);
  const lists = await Promise.all(cycles.map((cycle) => sessionsApi.listSessions(cycle.id)));
  const result: BoardSession[] = [];
  cycles.forEach((cycle, i) => {
    for (const session of lists[i]) {
      const dayIso = sessionDayIso(cycle.startDate, session, cycle.sessionsPerWeek ?? 0);
      if (utcDay(dayIso) < utcDay(from) || utcDay(dayIso) > utcDay(to)) continue;
      result.push({ id: session.id, name: session.name, status: session.status, dayIso, pain: false });
    }
  });
  return result;
}

// Sesiones de un atleta en la semana calendario que empieza en `monday`.
export function loadAthleteWeek(athleteCycles: TrainingCycle[], monday: string): Promise<BoardSession[]> {
  return loadAthleteSessions(athleteCycles, monday, addDays(monday, 6));
}
