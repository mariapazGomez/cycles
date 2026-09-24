import { IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

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
}
