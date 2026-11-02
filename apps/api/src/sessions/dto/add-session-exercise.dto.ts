import { IsInt, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from "class-validator";
import { NOTE_MAX_LENGTH } from "../../common/exercise-note";

export class AddSessionExerciseDto {
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

  // Repeticiones en reserva objetivo (0–4). Ver PRD-EjecucionYSeguimiento.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  targetRir?: number;

  // Nota para el atleta (hasta 500 caracteres). Vacía = sin nota.
  @IsOptional()
  @IsString()
  @MaxLength(NOTE_MAX_LENGTH, { message: "La nota puede tener hasta 500 caracteres." })
  note?: string;
}
