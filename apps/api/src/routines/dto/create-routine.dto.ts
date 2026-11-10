import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { RoutineBlockInputDto } from "./routine-block-input.dto";
import { RoutineExerciseInputDto } from "./routine-exercise-input.dto";

export class CreateRoutineDto {
  @IsString()
  @MinLength(1)
  name!: string;

  // Ejercicios sueltos (sin bloque); van después de los bloques. Hace falta al menos
  // un ejercicio en total, dentro de los bloques o aquí.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseInputDto)
  exercises?: RoutineExerciseInputDto[];

  // Bloques de trabajo en orden, cada uno con sus ejercicios (CYC-275).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineBlockInputDto)
  blocks?: RoutineBlockInputDto[];
}
