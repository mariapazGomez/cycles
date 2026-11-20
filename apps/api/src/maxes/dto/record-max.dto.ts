import { IsDateString, IsNumber, IsOptional, Max, Min } from "class-validator";

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
}
