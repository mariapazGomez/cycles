import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";

export class RegisterDto {
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

  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;
}
