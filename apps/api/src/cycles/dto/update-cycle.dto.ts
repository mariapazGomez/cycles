import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
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
}
