import { ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
import { Equipment, MuscleGroup } from "@prisma/client";

// Corregir un ejercicio propio: cualquier campo del alta, todos opcionales.
// `null` en la descripción o el video los borra.
export class UpdateExerciseDto {
  @IsOptional()
  @IsString({ message: "Escribe el nombre del ejercicio." })
  @MinLength(1, { message: "Escribe el nombre del ejercicio." })
  @MaxLength(120, { message: "El nombre es demasiado largo (máximo 120 caracteres)." })
  name?: string;

  @IsOptional()
  @IsEnum(MuscleGroup, { message: "Elige un grupo muscular." })
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @IsArray({ message: "Elige los implementos o marca «Peso corporal»." })
  @ArrayMinSize(1, { message: "Elige los implementos o marca «Peso corporal»." })
  @ArrayUnique({ message: "Hay implementos repetidos." })
  @IsEnum(Equipment, { each: true, message: "Hay un implemento que no existe." })
  equipment?: Equipment[];

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "La descripción es demasiado larga." })
  description?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true }, { message: "Pega un enlace que empiece con https://" })
  videoUrl?: string | null;
}
