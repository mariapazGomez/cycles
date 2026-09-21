import { IsEmail, IsString, MinLength } from "class-validator";

export class InviteAthleteDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;
}
