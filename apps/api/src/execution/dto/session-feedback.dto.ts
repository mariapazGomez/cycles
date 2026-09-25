import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { SessionOutcome } from "@prisma/client";

export class SessionFeedbackDto {
  @IsEnum(SessionOutcome)
  outcome!: SessionOutcome;

  // Esfuerzo de la sesión, escala CR-10 de Foster. Obligatorio si outcome = completed.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  srpe?: number;

  // Si falta y la sesión tiene startedAt, se calcula desde el inicio.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  pain?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  painNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Presente cuando corrige un feedback ya enviado.
  @IsOptional()
  @IsUUID()
  supersedesId?: string;
}
