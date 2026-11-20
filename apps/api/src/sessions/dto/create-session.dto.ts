import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, Min, ValidateNested } from "class-validator";

// Peso fijo (kg) para un ejercicio de la rutina con % del RM en el que el atleta aún no tiene RM (CYC-306).
export class FixedWeightDto {
  @IsString()
  exerciseId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(1000)
  weightKg!: number;
}

// Dos formas de ubicar la sesión:
//  - por día: solo scheduledDate; el servidor calcula la semana y el espacio, y
//    permite varias sesiones el mismo día (Biblioteca del coach);
//  - por celda: weekNumber y slotNumber (la grilla anterior, con tope de
//    sesiones por semana).
export class CreateSessionDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  weekNumber?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  slotNumber?: number;

  @IsString()
  routineId!: string;

  // Alternativa a un RM faltante: peso fijo por ejercicio de la rutina que lleva %.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FixedWeightDto)
  fixedWeights?: FixedWeightDto[];

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  // Fecha local del coach (AAAA-MM-DD): fija qué es «hoy» al validar el día.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}
