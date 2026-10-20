import { IsString, MinLength } from "class-validator";
import { AcceptPolicy } from "../../common/policy";

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password!: string;

  // Aceptación explícita de los Términos de uso y la Política de privacidad.
  @AcceptPolicy()
  acceptPolicy!: boolean;
}
