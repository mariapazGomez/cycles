import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateSessionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
