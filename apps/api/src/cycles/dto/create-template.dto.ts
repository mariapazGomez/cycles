import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

// Un ciclo plantilla: sin atleta ni fechas reales. Se define por su duración y
// su frecuencia, y se asigna después a un atleta.
export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @IsIn(["microcycle", "mesocycle"])
  cycleType!: "microcycle" | "mesocycle";

  @IsInt()
  @Min(1)
  @Max(52)
  weeks!: number;

  @IsInt()
  @Min(1)
  @Max(14)
  sessionsPerWeek!: number;
}
