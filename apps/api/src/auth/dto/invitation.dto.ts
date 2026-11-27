import { IsString, MaxLength, MinLength } from "class-validator";

export class InvitationTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  token!: string;
}
