import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from "class-validator";

export class LogSetDto {
  // Lo genera el cliente: si llega dos veces (reintento con mala conexión),
  // la segunda devuelve el registro ya guardado en vez de duplicar la serie.
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  setNumber!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  actualReps!: number;

  // En kg. Omitido = peso corporal.
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualWeight?: number;

  // Repeticiones en reserva: 0, 1, 2, 3 o 4 (= "4 o más").
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  rir?: number;

  // Presente cuando es una corrección de un registro anterior.
  @IsOptional()
  @IsUUID()
  supersedesId?: string;
}
