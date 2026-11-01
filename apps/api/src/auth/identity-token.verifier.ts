import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type KeyLike } from "jose";

export type SocialProvider = "google" | "apple";

export interface VerifiedIdentity {
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

const PROVIDERS = {
  google: {
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    jwks: "https://www.googleapis.com/oauth2/v3/certs",
  },
  apple: {
    issuers: ["https://appleid.apple.com"],
    jwks: "https://appleid.apple.com/auth/keys",
  },
} as const;

const INVALID_TOKEN_MESSAGE = "No pudimos verificar tu inicio de sesión. Vuelve a intentarlo.";

// Verifica los tokens de identidad que la app recibe de Apple y de Google:
// firma contra las claves públicas del proveedor, emisor, audiencia (los
// identificadores de nuestra app), caducidad y nonce.
@Injectable()
export class IdentityTokenVerifier {
  private readonly remoteKeys: Partial<Record<SocialProvider, JWTVerifyGetKey>> = {};

  constructor(private readonly config: ConfigService) {}

  // Audiencias aceptadas por proveedor. Apple: el identificador del paquete de la
  // app. Google: el ID de cliente de iOS y, si el SDK se configura con él, el web.
  private audiences(provider: SocialProvider): string[] {
    const keys = provider === "apple" ? ["APPLE_CLIENT_ID"] : ["GOOGLE_IOS_CLIENT_ID", "GOOGLE_CLIENT_ID"];
    return keys.map((key) => this.config.get<string>(key)?.trim() ?? "").filter(Boolean);
  }

  isConfigured(provider: SocialProvider): boolean {
    return this.audiences(provider).length > 0;
  }

  // Punto de reemplazo en las pruebas: aquí se devuelven las claves públicas.
  protected keyFor(provider: SocialProvider): JWTVerifyGetKey | KeyLike {
    return (this.remoteKeys[provider] ??= createRemoteJWKSet(new URL(PROVIDERS[provider].jwks)));
  }

  async verify(provider: SocialProvider, idToken: string, nonce: string): Promise<VerifiedIdentity> {
    const audience = this.audiences(provider);
    if (audience.length === 0) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    let payload;
    try {
      const key = this.keyFor(provider);
      ({ payload } = await jwtVerify(idToken, key as JWTVerifyGetKey, {
        issuer: [...PROVIDERS[provider].issuers],
        audience,
        algorithms: ["RS256"],
      }));
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    // La app genera el nonce y lo manda a Apple ya con SHA-256; Google lo devuelve
    // tal cual. Se acepta cualquiera de las dos formas del que generó esta app.
    const claim = typeof payload.nonce === "string" ? payload.nonce : "";
    const hashed = createHash("sha256").update(nonce).digest("hex");
    if (!nonce || (claim !== nonce && claim !== hashed)) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return {
      subject: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      // Apple manda email_verified como texto ("true"); Google como booleano.
      emailVerified: payload.email_verified === true || payload.email_verified === "true",
    };
  }
}
