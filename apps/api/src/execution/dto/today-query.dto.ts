import { IsOptional, IsUUID, Matches } from "class-validator";

export class TodayQueryDto {
  // Día calendario del atleta (según su zona horaria) "YYYY-MM-DD": el
  // servidor no conoce esa zona, así que el cliente dice qué día es "hoy".
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  date?: string;

  // Pide una sesión pendiente concreta (p. ej. la asignada para hoy) en vez
  // de la primera pendiente del plan.
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
