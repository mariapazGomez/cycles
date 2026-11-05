import { UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { generateKeyPair, SignJWT, type KeyLike } from "jose";
import { IdentityTokenVerifier, SocialProvider } from "./identity-token.verifier";

const NONCE = "nonce-aleatorio-de-prueba-1234";
const APPLE_AUD = "app.getcycles.mobile";
const GOOGLE_AUD = "ios-client.apps.googleusercontent.com";
const GOOGLE_ANDROID_AUD = "android-client.apps.googleusercontent.com";

class TestVerifier extends IdentityTokenVerifier {
  constructor(private readonly publicKey: KeyLike) {
    super({
      get: (key: string) =>
        ({ APPLE_CLIENT_ID: APPLE_AUD, GOOGLE_IOS_CLIENT_ID: GOOGLE_AUD, GOOGLE_ANDROID_CLIENT_ID: GOOGLE_ANDROID_AUD })[key],
    } as never);
  }
  protected keyFor() {
    return this.publicKey;
  }
}

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const verifier = new TestVerifier(publicKey);
  const sign = (
    claims: Record<string, unknown>,
    opts: { iss?: string; aud?: string; exp?: string; key?: KeyLike } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(opts.iss ?? "https://appleid.apple.com")
      .setAudience(opts.aud ?? APPLE_AUD)
      .setExpirationTime(opts.exp ?? "5m")
      .sign(opts.key ?? privateKey);
  return { verifier, sign, privateKey };
}

describe("IdentityTokenVerifier", () => {
  it("acepta un token de Apple válido, con el nonce hasheado, y entiende email_verified como texto", async () => {
    const { verifier, sign } = await setup();
    const hashed = createHash("sha256").update(NONCE).digest("hex");
    const token = await sign({ sub: "apple-1", email: "a@b.cl", email_verified: "true", nonce: hashed });
    await expect(verifier.verify("apple", token, NONCE)).resolves.toEqual({
      subject: "apple-1",
      email: "a@b.cl",
      emailVerified: true,
    });
  });

  it("acepta un token de Google con el nonce tal cual", async () => {
    const { verifier, sign } = await setup();
    const token = await sign(
      { sub: "g-1", email: "a@b.cl", email_verified: true, nonce: NONCE },
      { iss: "https://accounts.google.com", aud: GOOGLE_AUD },
    );
    const result = await verifier.verify("google", token, NONCE);
    expect(result).toMatchObject({ subject: "g-1", emailVerified: true });
  });

  it.each<[string, (s: Awaited<ReturnType<typeof setup>>) => Promise<string>, SocialProvider]>([
    ["nonce distinto", ({ sign }) => sign({ sub: "x", nonce: "otro" }), "apple"],
    ["sin nonce", ({ sign }) => sign({ sub: "x" }), "apple"],
    ["audiencia ajena", ({ sign }) => sign({ sub: "x", nonce: NONCE }, { aud: "otra.app" }), "apple"],
    ["emisor ajeno", ({ sign }) => sign({ sub: "x", nonce: NONCE }, { iss: "https://evil.example" }), "apple"],
    ["emisor de Google en Apple", ({ sign }) => sign({ sub: "x", nonce: NONCE }, { iss: "https://accounts.google.com" }), "apple"],
    ["vencido", ({ sign }) => sign({ sub: "x", nonce: NONCE }, { exp: "-1m" }), "apple"],
    ["sin sub", ({ sign }) => sign({ nonce: NONCE }), "apple"],
  ])("rechaza un token con %s", async (_name, build, provider) => {
    const ctx = await setup();
    const token = await build(ctx);
    await expect(ctx.verifier.verify(provider, token, NONCE)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("GOOGLE_ANDROID_CLIENT_ID acepta varios IDs separados por coma", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    class Multi extends IdentityTokenVerifier {
      constructor() {
        super({ get: (key: string) => (key === "GOOGLE_ANDROID_CLIENT_ID" ? "uno.apps.googleusercontent.com, dos.apps.googleusercontent.com" : undefined) } as never);
      }
      protected keyFor() {
        return publicKey;
      }
    }
    const verifier = new Multi();
    for (const aud of ["uno.apps.googleusercontent.com", "dos.apps.googleusercontent.com"]) {
      const token = await new SignJWT({ sub: "m", nonce: NONCE })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuer("https://accounts.google.com")
        .setAudience(aud)
        .setExpirationTime("5m")
        .sign(privateKey);
      await expect(verifier.verify("google", token, NONCE)).resolves.toMatchObject({ subject: "m" });
    }
  });

  it("acepta un token de Google cuya audiencia es el ID de cliente de Android", async () => {
    const { verifier, sign } = await setup();
    const token = await sign(
      { sub: "g-android", email: "a@example.com", email_verified: true, nonce: NONCE },
      { iss: "https://accounts.google.com", aud: GOOGLE_ANDROID_AUD },
    );
    const result = await verifier.verify("google", token, NONCE);
    expect(result.subject).toBe("g-android");
  });

  it("rechaza un token firmado con otra clave", async () => {
    const { verifier, sign } = await setup();
    const other = await generateKeyPair("RS256");
    const token = await sign({ sub: "x", nonce: NONCE }, { key: other.privateKey });
    await expect(verifier.verify("apple", token, NONCE)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rechaza un nonce vacío aunque el token no lo traiga", async () => {
    const { verifier, sign } = await setup();
    const token = await sign({ sub: "x" });
    await expect(verifier.verify("apple", token, "")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("Apple usa el identificador del paquete de la app aunque APPLE_CLIENT_ID no esté definida", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    class Bare extends IdentityTokenVerifier {
      protected keyFor() {
        return publicKey;
      }
    }
    const verifier = new Bare({ get: () => undefined } as never);
    const token = await new SignJWT({ sub: "x", nonce: NONCE })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("https://appleid.apple.com")
      .setAudience(APPLE_AUD)
      .setExpirationTime("5m")
      .sign(privateKey);
    expect(verifier.isConfigured("apple")).toBe(true);
    await expect(verifier.verify("apple", token, NONCE)).resolves.toMatchObject({ subject: "x" });
  });

  it("Google sin identificadores configurados no acepta nada", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    class Unconfigured extends IdentityTokenVerifier {
      protected keyFor() {
        return publicKey;
      }
    }
    const verifier = new Unconfigured({ get: () => undefined } as never);
    const token = await new SignJWT({ sub: "x", nonce: NONCE })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("https://accounts.google.com")
      .setAudience(GOOGLE_AUD)
      .setExpirationTime("5m")
      .sign(privateKey);
    expect(verifier.isConfigured("google")).toBe(false);
    await expect(verifier.verify("google", token, NONCE)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
