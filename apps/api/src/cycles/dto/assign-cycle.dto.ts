import { IsDateString, IsString } from "class-validator";

// Asigna una plantilla a un atleta: crea una copia que empieza en startDate.
export class AssignCycleDto {
  @IsString()
  athleteId!: string;

  @IsDateString()
  startDate!: string;
}
