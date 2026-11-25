import { IsDateString, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { CycleStatus } from "@prisma/client";

export class UpdateCycleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CycleStatus)
  status?: CycleStatus;

  // Fecha local del coach (AAAA-MM-DD): el inicio no puede ser anterior a hoy.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
