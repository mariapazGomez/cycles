import { IsDateString, IsOptional, IsString, Matches } from "class-validator";

// Asigna una plantilla a un atleta: crea una copia que empieza en startDate.
export class AssignCycleDto {
  @IsString()
  athleteId!: string;

  @IsDateString()
  startDate!: string;

  // Fecha local del coach (AAAA-MM-DD): el inicio no puede ser anterior a hoy.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
