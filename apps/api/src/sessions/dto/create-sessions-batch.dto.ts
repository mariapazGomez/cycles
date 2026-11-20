import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Matches } from "class-validator";

// La misma rutina en el mismo día para varios atletas (cada ciclo es de un atleta).
export class CreateSessionsBatchDto {
  @IsString()
  routineId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  cycleIds!: string[];

  @IsDateString()
  scheduledDate!: string;

  // Fecha local del coach (AAAA-MM-DD).
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
