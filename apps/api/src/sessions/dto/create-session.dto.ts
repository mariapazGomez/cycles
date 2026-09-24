import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateSessionDto {
  @IsInt()
  @IsPositive()
  weekNumber!: number;

  @IsInt()
  @IsPositive()
  slotNumber!: number;

  @IsString()
  routineId!: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
