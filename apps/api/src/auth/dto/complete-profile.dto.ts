import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { UserRole } from "@prisma/client";
import { AcceptPolicy } from "../../common/policy";

// Quien entró con Google elige su rol aquí: coach o atleta. Un atleta sin coach
// espera a que uno lo invite (ver PRD-General, sección 4).
export class CompleteProfileDto {
  @IsIn(["coach", "athlete"])
  role!: UserRole;

  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;

  @AcceptPolicy()
  acceptPolicy!: boolean;
}
