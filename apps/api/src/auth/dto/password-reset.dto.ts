import { IsEmail, IsString, MinLength } from "class-validator";
import { NormalizeEmail } from "../../common/validation/normalize-email";

export class RequestPasswordResetDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  newPassword!: string;
}
