import { IsUUID } from "class-validator";

export class SummaryQueryDto {
  @IsUUID()
  cycleId!: string;
}
