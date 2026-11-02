import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { IdentityTokenVerifier } from "./identity-token.verifier";
import { GoogleStrategy } from "./strategies/google.strategy";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (!googleConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] GOOGLE_CLIENT_ID/SECRET no configurados: login con Google deshabilitado en este entorno.",
  );
}

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, IdentityTokenVerifier, JwtStrategy, ...(googleConfigured ? [GoogleStrategy] : [])],
  exports: [AuthService],
})
export class AuthModule {}
