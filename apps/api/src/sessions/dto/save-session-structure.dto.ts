import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { WorkBlockFieldsDto } from "../../common/dto/work-block-fields.dto";
import { NOTE_MAX_LENGTH } from "../../common/exercise-note";

export class SessionStructureExerciseDto {
  // Presente = es un ejercicio que ya está en la sesión (conserva su id y sus series
  // registradas); ausente = ejercicio nuevo.
  @IsOptional()
  @IsString()
  id?: string;

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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  targetRir?: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTE_MAX_LENGTH, { message: "La nota puede tener hasta 500 caracteres." })
  note?: string;
}

export class SessionStructureBlockDto extends WorkBlockFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStructureExerciseDto)
  exercises!: SessionStructureExerciseDto[];
}

// La estructura completa de una sesión: bloques en orden con sus ejercicios, y los
// ejercicios sueltos al final (CYC-275).
export class SaveSessionStructureDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStructureBlockDto)
  blocks?: SessionStructureBlockDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStructureExerciseDto)
  exercises?: SessionStructureExerciseDto[];
}
