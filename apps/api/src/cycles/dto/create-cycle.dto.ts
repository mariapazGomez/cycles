import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches, MinLength } from "class-validator";
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

  // Ya no se pide (CYC-314): sin valor queda «mesocycle». Se sigue aceptando por la web antigua.
  @IsOptional()
  @IsEnum(CycleType)
  cycleType?: CycleType;

  // Fecha local del coach (AAAA-MM-DD): un ciclo no empieza antes de hoy.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;

  // Ya no se pide (CYC-314): los ciclos se crean por fechas. Se sigue aceptando.
  @IsOptional()
  @IsInt()
  @IsPositive()
  sessionsPerWeek?: number;

  // Si este plan vive dentro de un macrociclo contenedor.
  @IsOptional()
  @IsString()
  parentCycleId?: string;
}
