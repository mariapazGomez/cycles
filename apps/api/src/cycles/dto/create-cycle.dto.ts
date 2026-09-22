import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

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
}
