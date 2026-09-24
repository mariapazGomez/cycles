import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { RoutineExerciseInputDto } from "./routine-exercise-input.dto";

export class UpdateRoutineDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  // Reemplaza la lista completa de ejercicios — más simple que diffear
  // parcialmente (ver PRD-RutinasYProgramacion.md).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseInputDto)
  exercises?: RoutineExerciseInputDto[];
}
