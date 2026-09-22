import { IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class AddSessionExerciseDto {
  @IsString()
  exerciseId!: string;

  @IsInt()
  @IsPositive()
  targetSets!: number;

  @IsInt()
  @IsPositive()
  targetReps!: number;

  @IsOptional()
  @IsPositive()
  targetWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetRestSeconds?: number;
}
