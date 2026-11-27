import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { SummaryQueryDto } from "../../tracking/dto/summary.query.dto";

export class BoardSessionsQueryDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  // Con «true» suma las series de cada sesión (para el aviso de choque de carga).
  @IsOptional()
  @IsIn(["true", "false"])
  volumes?: "true" | "false";

  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class BoardEventsQueryDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class BoardAdherenceQueryDto extends SummaryQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
