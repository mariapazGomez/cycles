import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class RecordMaxDto {
  // RM en kg (peso máximo a 1 repetición).
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(1000)
  weightKg!: number;

  // Cuándo se midió. Sin fecha, hoy.
  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  // «coach»: lo midió o decidió el coach. «estimated»: RM aproximado que el coach calculó en la
  // pantalla (Epley, peso × (1 + reps ÷ 30)) y decidió guardar; nada lo crea solo.
  @IsOptional()
  @IsIn(["coach", "estimated"])
  source?: "coach" | "estimated";

  // Opcional, solo con «estimated»: la serie en la que se basó el cálculo.
  @IsOptional()
  @IsString()
  basedOnLogId?: string;
}
