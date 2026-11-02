import { IsOptional, IsString, MinLength } from "class-validator";
import { AcceptPolicy } from "../../common/policy";

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  // Solo para cuentas nuevas; un atleta que ya tenía cuenta no la manda.
  @IsOptional()
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password?: string;

  // Aceptación explícita de los Términos de uso y la Política de privacidad.
  @AcceptPolicy()
  acceptPolicy!: boolean;
}

export class PreviewInvitationDto {
  @IsString()
  token!: string;
}
