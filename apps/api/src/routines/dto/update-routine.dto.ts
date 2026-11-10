import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { RoutineBlockInputDto } from "./routine-block-input.dto";
import { RoutineExerciseInputDto } from "./routine-exercise-input.dto";

export class UpdateRoutineDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  // Con `exercises` o `blocks` se reemplaza la estructura completa de la rutina: los
  // bloques de `blocks` en orden (los que traen `id` conservan el suyo y los demás son
  // nuevos), y los ejercicios sueltos de `exercises` al final. Lo que no venga se quita.
  // Sin ninguno de los dos solo cambia el nombre (ver PRD-RutinasYProgramacion.md).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseInputDto)
  exercises?: RoutineExerciseInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineBlockInputDto)
  blocks?: RoutineBlockInputDto[];
}
