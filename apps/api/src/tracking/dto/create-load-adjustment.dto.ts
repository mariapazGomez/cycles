import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, NotEquals } from "class-validator";

export class CreateLoadAdjustmentDto {
  @IsString()
  exerciseId!: string;

  // Primera semana del plan afectada; solo cambian sesiones pendientes.
  @IsInt()
  @Min(1)
  fromWeek!: number;

  // Porcentaje sobre el peso objetivo actual, p. ej. -5 o 2.5.
  @IsNumber()
  @Min(-20)
  @Max(20)
  @NotEquals(0)
  percentChange!: number;

  // Regla que originó el ajuste; "manual" si el coach lo decidió sin sugerencia.
  @IsOptional()
  @IsIn(["high_load", "low_load", "manual"])
  reason?: string;
}
