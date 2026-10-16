import { IsEmail, IsString, MinLength } from "class-validator";
import { NormalizeEmail } from "../../common/validation/normalize-email";

export class InviteAthleteDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;
}
