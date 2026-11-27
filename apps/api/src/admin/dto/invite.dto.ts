import { IsEmail, MaxLength } from "class-validator";
import { NormalizeEmail } from "../../common/validation/normalize-email";

export class InviteDto {
  @NormalizeEmail()
  @IsEmail({}, { message: "El correo no es válido." })
  @MaxLength(200)
  email!: string;
}
