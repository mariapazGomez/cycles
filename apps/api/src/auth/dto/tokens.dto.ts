import { IsString, MaxLength, MinLength } from "class-validator";

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}

export class GoogleExchangeDto {
  @IsString()
  code!: string;
}

// Token de identidad de Apple o Google que la app obtuvo en el teléfono, más el
// nonce con el que lo pidió.
export class SocialLoginDto {
  @IsString()
  @MaxLength(4096)
  idToken!: string;

  @IsString()
  @MinLength(16)
  @MaxLength(256)
  nonce!: string;
}
