import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class TeamCycleDatesDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  // Fecha local del coach (AAAA-MM-DD).
  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class CreateTeamCycleDto extends TeamCycleDatesDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Ponle un nombre al ciclo." })
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  // Quiénes lo reciben (el coach decide por persona). Se puede crear sin nadie.
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("all", { each: true })
  athleteIds!: string[];
}

export class UpdateTeamCycleDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class AddTeamSessionDto {
  @IsString()
  routineId!: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class DuplicateTeamSessionDto {
  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class UpdateTeamSessionDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class JoinTeamCycleDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("all", { each: true })
  athleteIds!: string[];

  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class TodayQueryDto {
  @IsOptional()
  @Matches(DAY)
  today?: string;
}

export class TeamCycleDetailsQueryDto extends TodayQueryDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;
}
