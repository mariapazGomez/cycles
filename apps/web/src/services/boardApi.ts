import type { TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "./cyclesApi";
import * as sessionsApi from "./sessionsApi";
import type { BoardSession } from "../lib/weekBoard";
import { addDays, sessionDayIso, utcDay } from "../lib/weekCalendar";

// Ciclos con sesiones que pueden caer en la semana `monday`..domingo: los
// activos del atleta y, si son macrociclos, los ciclos que contienen.
async function cyclesOfWeek(athleteCycles: TrainingCycle[], monday: string): Promise<TrainingCycle[]> {
  const sunday = addDays(monday, 6);
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
  return leaves.filter(
    (c) => (c.sessionsPerWeek ?? 0) > 0 && utcDay(c.startDate) <= utcDay(sunday) && utcDay(c.endDate) >= utcDay(monday),
  );
}

// Sesiones de un atleta en la semana calendario que empieza en `monday`.
export async function loadAthleteWeek(athleteCycles: TrainingCycle[], monday: string): Promise<BoardSession[]> {
  const sunday = addDays(monday, 6);
  const cycles = await cyclesOfWeek(athleteCycles, monday);
  const lists = await Promise.all(cycles.map((cycle) => sessionsApi.listSessions(cycle.id)));
  const result: BoardSession[] = [];
  cycles.forEach((cycle, i) => {
    for (const session of lists[i]) {
      const dayIso = sessionDayIso(cycle.startDate, session, cycle.sessionsPerWeek ?? 0);
      if (utcDay(dayIso) < utcDay(monday) || utcDay(dayIso) > utcDay(sunday)) continue;
      result.push({ id: session.id, name: session.name, status: session.status, dayIso, pain: false });
    }
  });
  return result;
}
