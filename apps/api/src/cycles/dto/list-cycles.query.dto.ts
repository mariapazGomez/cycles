import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { CycleStatus } from "@prisma/client";

export class ListCyclesQueryDto {
  // Solo lo usa un coach para filtrar por uno de sus atletas; un atleta
  // siempre ve únicamente sus propios ciclos, este filtro se ignora para él.
  @IsOptional()
  @IsString()
  athleteId?: string;

  @IsOptional()
  @IsEnum(CycleStatus)
  status?: CycleStatus;

  // Solo para el coach. Por defecto la lista no trae las plantillas; "include"
  // las suma a los ciclos de sus atletas y "only" trae solo las plantillas.
  @IsOptional()
  @IsIn(["include", "only"])
  templates?: "include" | "only";
}
