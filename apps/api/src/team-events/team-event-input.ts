import { BadRequestException } from "@nestjs/common";
import type { TeamEventType } from "@cycles/shared";
import { parseCreate, parseUpdate, type EventFields } from "../events/event-input";

// Validación de un evento del equipo (CYC-317). Mismas reglas de fecha, hora, duración, notas y
// repetición que las actividades del atleta; sin deporte ni intensidad y sin el tipo «lesión».

export const TEAM_EVENT_TYPES = ["match", "training", "travel", "rest", "other"] as const satisfies readonly TeamEventType[];
const TEAM_KEYS = ["type", "title", "date", "startTime", "durationMin", "allDay", "notes", "repeat"];

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

function checked(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("El cuerpo debe ser un objeto.");
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).filter((k) => !TEAM_KEYS.includes(k));
  if (extra.length > 0) fail(`Campos que no existen: ${extra.join(", ")}.`);
  if (record.type !== undefined && !(TEAM_EVENT_TYPES as readonly unknown[]).includes(record.type)) {
    fail(`«type» debe ser uno de: ${TEAM_EVENT_TYPES.join(", ")}.`);
  }
  return record;
}

export function parseTeamEvent(body: unknown): EventFields {
  return parseCreate(checked(body));
}

// Editar cambia toda la serie.
export function parseTeamEventPatch(body: unknown): Partial<EventFields> {
  return parseUpdate({ ...checked(body), scope: "series" }).patch;
}
