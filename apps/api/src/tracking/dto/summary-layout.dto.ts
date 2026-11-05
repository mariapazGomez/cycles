import { IsArray } from "class-validator";

// El contenido de cada gráfico se valida a fondo en `parseLayout` (summary-layout.ts).
export class SaveSummaryLayoutDto {
  @IsArray({ message: "«charts» debe ser una lista." })
  charts!: unknown[];
}
