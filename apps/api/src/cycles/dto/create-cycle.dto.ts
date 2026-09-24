import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MinLength } from "class-validator";
import { CycleType } from "@prisma/client";

export class CreateCycleDto {
  @IsString()
  athleteId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(CycleType)
  cycleType!: CycleType;

  // Requerido salvo que cycleType sea 'macrocycle' (un macrociclo no tiene
  // grid propio) — se valida en el service, no acá, porque depende de otro campo.
  @IsOptional()
  @IsInt()
  @IsPositive()
  sessionsPerWeek?: number;

  // Si este plan vive dentro de un macrociclo contenedor.
  @IsOptional()
  @IsString()
  parentCycleId?: string;
}
