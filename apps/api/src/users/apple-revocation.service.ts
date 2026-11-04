import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SignJWT, decodeJwt, importPKCS8 } from "jose";
import { APPLE_BUNDLE_ID } from "../auth/identity-token.verifier";

const APPLE_ID_URL = "https://appleid.apple.com";
// Equipo de Apple Developer de la cuenta (público; APPLE_TEAM_ID solo lo reemplaza).
const APPLE_TEAM_ID = "Y6Z96XJBFW";
const TIMEOUT_MS = 8_000;

// revoked: Apple dejó sin efecto la autorización · skipped: sin llave configurada ·
// failed: Apple no respondió o rechazó · mismatch: el código es de otra cuenta de Apple.
export type RevocationOutcome = "revoked" | "skipped" | "failed" | "mismatch";

// Al eliminar la cuenta de quien entra con Apple hay que revocar su autorización
// (regla 5.1.1(v) de Apple). No se guarda ningún token de Apple: la app pide a
// Apple un código de un solo uso en el momento de eliminar, y aquí se canjea y se
// revoca de inmediato. Ver docs/SEGURIDAD.md.
@Injectable()
export class AppleRevocationService {
  private readonly logger = new Logger(AppleRevocationService.name);

  constructor(private readonly config: ConfigService) {}

  private get(key: string): string {
    return this.config.get<string>(key)?.trim() ?? "";
  }

  isConfigured(): boolean {
    return Boolean(this.get("APPLE_KEY_ID") && this.get("APPLE_PRIVATE_KEY"));
  }

  // Secreto de cliente de Apple: un JWT firmado con la llave de Sign in with Apple.
  private async clientSecret(clientId: string): Promise<string> {
    // Render guarda las llaves en una sola línea con \n literales.
    const pem = this.get("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n");
    const key = await importPKCS8(pem, "ES256");
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: this.get("APPLE_KEY_ID") })
      .setIssuer(this.get("APPLE_TEAM_ID") || APPLE_TEAM_ID)
      .setIssuedAt()
      .setExpirationTime("5m")
      .setAudience(APPLE_ID_URL)
      .setSubject(clientId)
      .sign(key);
  }

  private async post(path: string, body: Record<string, string>): Promise<Response> {
    return fetch(`${APPLE_ID_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  // `subject` es el identificador de Apple vinculado a la cuenta que se elimina.
  async revoke(authorizationCode: string, subject: string): Promise<RevocationOutcome> {
    if (!this.isConfigured()) {
      this.logger.warn("Revocación de Apple omitida: faltan APPLE_KEY_ID o APPLE_PRIVATE_KEY.");
      return "skipped";
    }
    try {
      const clientId = this.get("APPLE_CLIENT_ID") || APPLE_BUNDLE_ID;
      const secret = await this.clientSecret(clientId);

      const exchange = await this.post("/auth/token", {
        client_id: clientId,
        client_secret: secret,
        code: authorizationCode,
        grant_type: "authorization_code",
      });
      if (!exchange.ok) {
        this.logger.warn(`Apple rechazó el código de autorización (HTTP ${exchange.status}).`);
        return "failed";
      }
      const tokens = (await exchange.json()) as { refresh_token?: string; id_token?: string };
      if (!tokens.refresh_token) {
        this.logger.warn("Apple no devolvió un token que revocar.");
        return "failed";
      }

      // Que el código sea de la misma cuenta de Apple vinculada. Si no, se revoca
      // lo recién creado (no queda una autorización colgando) y se avisa.
      const sameAccount = tokens.id_token ? decodeJwt(tokens.id_token).sub === subject : false;

      const revoked = await this.post("/auth/revoke", {
        client_id: clientId,
        client_secret: secret,
        token: tokens.refresh_token,
        token_type_hint: "refresh_token",
      });
      if (!sameAccount) {
        return "mismatch";
      }
      if (!revoked.ok) {
        this.logger.warn(`Apple no pudo revocar la autorización (HTTP ${revoked.status}).`);
        return "failed";
      }
      return "revoked";
    } catch {
      // Nunca se registra el error completo: puede traer el cuerpo con tokens (R8).
      this.logger.warn("No se pudo completar la revocación con Apple.");
      return "failed";
    }
  }
}
