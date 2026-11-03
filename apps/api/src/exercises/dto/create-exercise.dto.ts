import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
import { Equipment, MuscleGroup } from "@prisma/client";

export class CreateExerciseDto {
  @IsString({ message: "Escribe el nombre del ejercicio." })
  @MinLength(1, { message: "Escribe el nombre del ejercicio." })
  @MaxLength(120, { message: "El nombre es demasiado largo (máximo 120 caracteres)." })
  name!: string;

  @IsEnum(MuscleGroup, { message: "Elige un grupo muscular." })
  muscleGroup!: MuscleGroup;

  // Opcionales; no pueden repetirse ni incluir el principal (se valida en el servicio).
  @IsOptional()
  @IsArray({ message: "Los grupos secundarios no son válidos." })
  @ArrayMaxSize(8, { message: "Los grupos secundarios no son válidos." })
  @ArrayUnique({ message: "Hay grupos secundarios repetidos." })
  @IsEnum(MuscleGroup, { each: true, message: "Hay un grupo secundario que no existe." })
  secondaryMuscleGroups?: MuscleGroup[];

  // Al menos uno; «bodyweight» va solo (se valida en el servicio).
  @IsArray({ message: "Elige los implementos o marca «Peso corporal»." })
  @ArrayMinSize(1, { message: "Elige los implementos o marca «Peso corporal»." })
  @ArrayUnique({ message: "Hay implementos repetidos." })
  @IsEnum(Equipment, { each: true, message: "Hay un implemento que no existe." })
  equipment!: Equipment[];

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "La descripción es demasiado larga." })
  description?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true }, { message: "Pega un enlace que empiece con https://" })
  videoUrl?: string;
}
