import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { UserRole } from "@prisma/client";
import { AcceptPolicy } from "../../common/policy";

// Solo permite 'coach': el rol 'athlete' se asigna vía invitación (ver
// PRD-General, sección 4), nunca por auto-selección.
export class CompleteProfileDto {
  @IsIn(["coach"])
  role!: UserRole;

  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;

  @AcceptPolicy()
  acceptPolicy!: boolean;
}
