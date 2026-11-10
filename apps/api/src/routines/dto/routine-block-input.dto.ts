import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { WorkBlockFieldsDto } from "../../common/dto/work-block-fields.dto";
import { RoutineExerciseInputDto } from "./routine-exercise-input.dto";

export class RoutineBlockInputDto extends WorkBlockFieldsDto {
  // Los ejercicios del bloque, en el orden en que se hacen. Puede estar vacío.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseInputDto)
  exercises!: RoutineExerciseInputDto[];
}
