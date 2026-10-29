import { IsDateString, IsOptional, Matches } from "class-validator";

export class DuplicateSessionDto {
  @IsDateString()
  scheduledDate!: string;

  // Fecha local del coach (AAAA-MM-DD): fija qué es «hoy» al validar el día.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
