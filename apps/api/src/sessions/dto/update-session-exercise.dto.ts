import { IsInt, IsOptional, IsPositive, Max, Min } from "class-validator";

export class UpdateSessionExerciseDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  targetSets?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  targetReps?: number;

  @IsOptional()
  @IsPositive()
  targetWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetRestSeconds?: number;

  // Repeticiones en reserva objetivo (0–4). Ver PRD-EjecucionYSeguimiento.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  targetRir?: number;
}
