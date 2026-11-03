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

  // El registro ofrece las dos opciones. Un atleta que se registra solo queda
  // sin coach hasta que uno lo invite con el mismo correo (CYC-187).
  @IsIn(["coach", "athlete"])
  role!: UserRole;

  // Consentimiento opcional de estadísticas agregadas y anónimas.
  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;

  // Aceptación explícita de los Términos de uso y la Política de privacidad.
  @AcceptPolicy()
  acceptPolicy!: boolean;

  // Código de acceso del piloto (PILOT_ACCESS_CODE): deja crear una cuenta
  // aunque el registro esté cerrado al público.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accessCode?: string;

  // Solo atletas (CYC-194): qué teléfono usa. Con iPhone se invita a TestFlight al
  // correo del Apple ID, que puede ser distinto del de Cycles y solo se usa para eso.
  @IsOptional()
  @IsIn(["ios", "android"])
  phonePlatform?: "ios" | "android";

  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  appleIdEmail?: string;
}
