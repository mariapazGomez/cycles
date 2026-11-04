import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

// Valida el token que Cloudflare Access agrega a cada petición del portal
// (cabecera Cf-Access-Jwt-Assertion): firma contra las claves públicas del
// equipo, emisor, audiencia (la aplicación de Access) y vencimiento. La
// identidad (el correo) sale del token. Ver docs/diseno/panel-admin (S2) y
// https://developers.cloudflare.com/cloudflare-one/identity/users/validating-json
@Injectable()
export class AccessTokenVerifier {
  private keys: JWTVerifyGetKey | null = null;

  constructor(private readonly config: ConfigService) {}

  private get team(): string {
    return (this.config.get<string>("CF_ACCESS_TEAM_DOMAIN") ?? "").trim();
  }

  private get audience(): string {
    return (this.config.get<string>("CF_ACCESS_AUD") ?? "").trim();
  }

  // Sin las dos variables el portal queda cerrado: ninguna petición pasa.
  get configured(): boolean {
    return Boolean(this.team && this.audience);
  }

  // Las claves se piden a Cloudflare y se guardan un rato; si rotan, se
  // vuelven a pedir al ver un `kid` nuevo. Se puede reemplazar en pruebas.
  protected resolveKeys(team: string): JWTVerifyGetKey {
    return createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
      timeoutDuration: 5_000,
    });
  }

  async verify(token: string): Promise<{ email: string }> {
    if (!this.configured) throw new UnauthorizedException();
    this.keys ??= this.resolveKeys(this.team);
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: `https://${this.team}`,
        audience: this.audience,
        algorithms: ["RS256"],
      });
      // Los tokens de máquina (service tokens) no traen correo: no entran al portal.
      const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
      if (!email) throw new UnauthorizedException();
      return { email };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
