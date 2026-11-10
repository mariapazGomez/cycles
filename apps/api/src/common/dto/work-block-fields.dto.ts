import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { NOTE_MAX_LENGTH } from "../exercise-note";
import { BLOCK_TYPES, type BlockTypeValue } from "../work-blocks";

// Los campos de un bloque que guarda el coach; cada estructura (rutina o sesión) le
// agrega su lista de ejercicios.
export class WorkBlockFieldsDto {
  // Presente = es un bloque que ya existe (se conserva su id); ausente = bloque nuevo.
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(BLOCK_TYPES, { message: "Elige un tipo de bloque de la lista." })
  type!: BlockTypeValue;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTE_MAX_LENGTH, { message: "La nota puede tener hasta 500 caracteres." })
  note?: string;
}
