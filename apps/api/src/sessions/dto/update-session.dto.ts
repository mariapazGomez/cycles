import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
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
}
