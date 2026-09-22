import { IsInt, IsOptional, IsPositive, Min } from "class-validator";

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
}
