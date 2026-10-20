import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";
import { NormalizeEmail } from "../../common/validation/normalize-email";
import { AcceptPolicy } from "../../common/policy";

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  // Validado aquí como coach|athlete; AuthService rechaza 'athlete' porque
  // el alta de atletas es solo por invitación (ver PRD-General, sección 4).
  @IsIn(["coach", "athlete"])
  role!: UserRole;

  // Consentimiento opcional de estadísticas agregadas y anónimas.
  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;

  // Aceptación explícita de los Términos de uso y la Política de privacidad.
  @AcceptPolicy()
  acceptPolicy!: boolean;

  // Código de acceso del piloto (PILOT_ACCESS_CODE): deja crear una cuenta de
  // coach aunque el registro esté cerrado al público.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accessCode?: string;
}
