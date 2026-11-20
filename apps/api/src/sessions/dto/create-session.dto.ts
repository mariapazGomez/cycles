import { IsDateString, IsInt, IsOptional, IsPositive, IsString, Matches } from "class-validator";

// Dos formas de ubicar la sesión:
//  - por día: solo scheduledDate; el servidor calcula la semana y el espacio, y
//    permite varias sesiones el mismo día (Biblioteca del coach);
//  - por celda: weekNumber y slotNumber (la grilla anterior, con tope de
//    sesiones por semana).
export class CreateSessionDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  weekNumber?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  slotNumber?: number;

  @IsString()
  routineId!: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  // Fecha local del coach (AAAA-MM-DD): fija qué es «hoy» al validar el día.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
