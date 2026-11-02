import { IsOptional, IsString } from "class-validator";

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
