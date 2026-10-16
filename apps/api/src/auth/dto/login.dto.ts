import { IsEmail, IsString } from "class-validator";
import { NormalizeEmail } from "../../common/validation/normalize-email";

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
