import { IsIn } from "class-validator";
import { TourStatus } from "@prisma/client";

export class TourStatusDto {
  @IsIn(Object.values(TourStatus), { message: "El estado de la guía no es válido." })
  status!: TourStatus;
}
