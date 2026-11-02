import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

// El refresh token va en el cuerpo (app móvil) o, en la web, en la cookie `cycles_rt`.
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
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
