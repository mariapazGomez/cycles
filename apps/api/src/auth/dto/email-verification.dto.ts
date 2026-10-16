import { IsEmail, IsString } from "class-validator";
import { NormalizeEmail } from "../../common/validation/normalize-email";

export class VerifyEmailDto {
  @IsString()
  token!: string;
}

export class ResendVerificationDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}
