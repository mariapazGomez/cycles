import { IsDateString, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { SessionStatus } from "@prisma/client";

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  // Fecha local del coach (AAAA-MM-DD) al mover la sesión; ver createSession.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
