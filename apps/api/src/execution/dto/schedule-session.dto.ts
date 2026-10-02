import { IsOptional, Matches, ValidateIf } from "class-validator";

// El atleta elige en qué día hará cada sesión que el coach le programó.
export class ScheduleSessionDto {
  // Día calendario "YYYY-MM-DD" (sin hora). null = quitar el día asignado.
  @IsOptional()
  @ValidateIf((o: ScheduleSessionDto) => o.date !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  date?: string | null;
}
