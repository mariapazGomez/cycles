import { IsEnum, IsOptional, IsString, IsUrl, MinLength } from "class-validator";
import { MuscleGroup } from "@prisma/client";

export class CreateExerciseDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;
}
