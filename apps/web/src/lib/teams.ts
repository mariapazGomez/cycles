// Equipos del coach (CYC-310): textos y reglas puras para probarlas con jest.

export function initialOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// El color de la tarjeta sale de la inicial (el coach no elige color ni ícono).
const TEAM_COLORS = ["#2f9e5f", "#1a66dd", "#7a4bd6", "#d9588f", "#e8a317", "#0f8b9c"];
export function teamColor(name: string): string {
  const code = initialOf(name).charCodeAt(0);
  return TEAM_COLORS[code % TEAM_COLORS.length];
}

// «1 atleta» / «12 atletas»
export function athletesCount(n: number): string {
  return `${n} ${n === 1 ? "atleta" : "atletas"}`;
}

// Lo que sobra tras los avatares visibles: «+7».
export function extraMembers(total: number, shown: number): number {
  return Math.max(0, total - shown);
}

export type TeamAthleteState = "pending" | "no_cycle" | "attention" | "ok";

export const TEAM_STATE_LABEL: Record<TeamAthleteState, string> = {
  pending: "Invitación pendiente",
  no_cycle: "Sin ciclo",
  attention: "Con avisos",
  ok: "Al día",
};

// Estado de cada atleta en el detalle del equipo, con texto y no solo color.
export function teamAthleteState(input: { relation: "pending" | "active" | "inactive"; hasCycle: boolean; attentionCount: number }): TeamAthleteState {
  if (input.relation === "pending") return "pending";
  if (!input.hasCycle) return "no_cycle";
  return input.attentionCount > 0 ? "attention" : "ok";
}

// «Fuerza base, sem. 2»: la semana del ciclo que contiene hoy (desde su inicio).
export function cycleWeekLabel(cycle: { name: string; startDate: string; endDate: string }, todayIso: string): string {
  const start = Date.parse(`${cycle.startDate.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  const week = Math.max(1, Math.floor((today - start) / (7 * 86_400_000)) + 1);
  return `${cycle.name}, sem. ${week}`;
}

// Búsqueda sin importar mayúsculas ni tildes, por nombre o email.
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matchesAthlete(a: { name: string; email: string }, query: string): boolean {
  const q = normalizeText(query.trim());
  return q === "" || normalizeText(a.name).includes(q) || normalizeText(a.email).includes(q);
}
