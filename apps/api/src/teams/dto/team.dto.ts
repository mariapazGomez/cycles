import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateTeamDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Ponle un nombre al equipo." })
  @MaxLength(60, { message: "El nombre del equipo admite hasta 60 caracteres." })
  name!: string;

  // Se puede crear sin atletas y agregarlos después.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("all", { each: true })
  athleteIds?: string[];
}

export class RenameTeamDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Ponle un nombre al equipo." })
  @MaxLength(60, { message: "El nombre del equipo admite hasta 60 caracteres." })
  name!: string;
}

export class AddTeamMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID("all", { each: true })
  athleteIds!: string[];
}
