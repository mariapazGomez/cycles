import { IsOptional, Matches } from "class-validator";

export class WeeklySummaryQueryDto {
  // Cualquier día de la semana pedida, "AAAA-MM-DD" (el cliente manda su día local; el servidor no
  // conoce su zona horaria). Sin valor: la semana de hoy.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  weekStart?: string;
}
