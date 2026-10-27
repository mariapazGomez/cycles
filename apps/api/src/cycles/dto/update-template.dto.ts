import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @IsOptional()
  @IsIn(["microcycle", "mesocycle"])
  cycleType?: "microcycle" | "mesocycle";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  weeks?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  sessionsPerWeek?: number;
}
