import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from "class-validator";

export class RoutineExerciseInputDto {
  @IsString()
  exerciseId!: string;

  @IsInt()
  @IsPositive()
  defaultSets!: number;

  @IsInt()
  @IsPositive()
  defaultReps!: number;

  @IsOptional()
  @IsPositive()
  defaultWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultRestSeconds?: number;

  // Repeticiones en reserva objetivo (0–4). Ver PRD-EjecucionYSeguimiento.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  defaultRir?: number;
}
