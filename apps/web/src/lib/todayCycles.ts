// «Hoy» con dos ciclos a la vez (CYC-314, docs/diseno/ciclo-del-equipo, «Dos ciclos a la vez»).
// Reglas puras: qué tarjetas salen, en qué orden y cuál va abierta.
import { weekdayOf, MONTH_NAMES } from "./eventCalendar";
import type { TodayCycleEntry } from "../services/executionApi";

export type TodayCard =
  | { kind: "pending" | "upcoming"; key: string; cycleName: string; session: TodayCycleEntry["pending"][number] }
  | { kind: "done"; key: string; cycleName: string; session: TodayCycleEntry["done"][number] };

// Primero lo que está por hacer ahora; después, por ciclo, lo hecho hoy o la próxima sesión. Cada
// ciclo ocupa una tarjeta: si ya tiene una hecha hoy, solo suma otra si también es de hoy.
export function todayCards(entries: TodayCycleEntry[], todayIso: string): TodayCard[] {
  const now: TodayCard[] = [];
  const rest: TodayCard[] = [];
  for (const e of entries) {
    if (!e.upcoming) {
      const mine = e.done.length > 0 ? e.pending.filter((s) => s.scheduledDate?.slice(0, 10) === todayIso) : e.pending;
      for (const s of mine) now.push({ kind: "pending", key: s.id, cycleName: e.cycle.name, session: s });
    }
    for (const s of e.done) rest.push({ kind: "done", key: s.id, cycleName: e.cycle.name, session: s });
    if (e.upcoming && e.done.length === 0) {
      for (const s of e.pending.slice(0, 1)) rest.push({ kind: "upcoming", key: s.id, cycleName: e.cycle.name, session: s });
    }
  }
  return [...now, ...rest];
}

// La tarjeta que va abierta, con el botón principal: la que está en curso o, si no, la primera por hacer.
export function openCardKey(cards: TodayCard[]): string | null {
  const pending = cards.filter((c): c is Extract<TodayCard, { kind: "pending" | "upcoming" }> => c.kind === "pending");
  return (pending.find((c) => c.session.startedAt) ?? pending[0])?.key ?? null;
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// «Viernes 27»; con el mes si es otro («Viernes 4 dic»).
export function upcomingDayLabel(iso: string, todayIso: string): string {
  const day = iso.slice(0, 10);
  const month = day.slice(0, 7) === todayIso.slice(0, 7) ? "" : ` ${MONTH_NAMES[Number(day.slice(5, 7)) - 1].slice(0, 3).toLowerCase()}`;
  return `${WEEKDAYS[weekdayOf(day)]} ${Number(day.slice(8, 10))}${month}`;
}
