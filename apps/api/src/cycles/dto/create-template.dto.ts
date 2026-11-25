import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

// Un ciclo plantilla: sin atleta ni fechas reales. Se define por su duración en semanas y se
// asigna después a un atleta.
export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  // Ya no se pide (CYC-314): sin valor queda «mesocycle».
  @IsOptional()
  @IsIn(["microcycle", "mesocycle"])
  cycleType?: "microcycle" | "mesocycle";

  @IsInt()
  @Min(1)
  @Max(52)
  weeks!: number;

  // Ya no se pide (CYC-314).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  sessionsPerWeek?: number;
}
