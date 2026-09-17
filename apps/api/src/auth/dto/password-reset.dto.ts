import { IsEmail, IsString, MinLength } from "class-validator";

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  newPassword!: string;
}
