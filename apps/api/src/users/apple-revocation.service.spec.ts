import { exportPKCS8, generateKeyPair, SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { AppleRevocationService } from "./apple-revocation.service";

const KEY_ID = "ABC123DEFG";

async function makeConfig(overrides: Record<string, string> = {}) {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  const pem = await exportPKCS8(privateKey);
  const values: Record<string, string> = {
    APPLE_KEY_ID: KEY_ID,
    // Render guarda la llave en una línea con \n literales.
    APPLE_PRIVATE_KEY: pem.replace(/\n/g, "\\n"),
    ...overrides,
  };
  return { get: (key: string) => values[key] };
}

// id_token de Apple de mentira: el servicio solo lee el `sub`.
async function idToken(sub: string) {
  const { privateKey } = await generateKeyPair("ES256");
  return new SignJWT({ sub }).setProtectedHeader({ alg: "ES256" }).sign(privateKey);
}

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("AppleRevocationService", () => {
  it("sin llave configurada se omite sin llamar a Apple", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const service = new AppleRevocationService({ get: () => undefined } as never);
    expect(service.isConfigured()).toBe(false);
    await expect(service.revoke("codigo", "sub")).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("canjea el código, revoca el token y firma el secreto de cliente como pide Apple", async () => {
    const token = await idToken("001234.apple.sub");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ refresh_token: "r-token", id_token: token }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    global.fetch = fetchMock;
    const service = new AppleRevocationService((await makeConfig()) as never);

    await expect(service.revoke("codigo-de-apple", "001234.apple.sub")).resolves.toBe("revoked");

    const [exchangeUrl, exchange] = fetchMock.mock.calls[0];
    expect(exchangeUrl).toBe("https://appleid.apple.com/auth/token");
    const exchangeBody = exchange.body as URLSearchParams;
    expect(exchangeBody.get("grant_type")).toBe("authorization_code");
    expect(exchangeBody.get("code")).toBe("codigo-de-apple");
    expect(exchangeBody.get("client_id")).toBe("app.getcycles.mobile");

    const secret = exchangeBody.get("client_secret") as string;
    expect(decodeProtectedHeader(secret)).toMatchObject({ alg: "ES256", kid: KEY_ID });
    expect(decodeJwt(secret)).toMatchObject({ iss: "Y6Z96XJBFW", aud: "https://appleid.apple.com", sub: "app.getcycles.mobile" });

    const [revokeUrl, revoke] = fetchMock.mock.calls[1];
    expect(revokeUrl).toBe("https://appleid.apple.com/auth/revoke");
    const revokeBody = revoke.body as URLSearchParams;
    expect(revokeBody.get("token")).toBe("r-token");
    expect(revokeBody.get("token_type_hint")).toBe("refresh_token");
  });

  it("un código de otra cuenta de Apple se revoca igual y se informa como distinto", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ refresh_token: "r-token", id_token: await idToken("otra.cuenta") }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    global.fetch = fetchMock;
    const service = new AppleRevocationService((await makeConfig()) as never);
    await expect(service.revoke("codigo", "001234.apple.sub")).resolves.toBe("mismatch");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("si Apple rechaza el código o la revocación, informa la falla", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse({ error: "invalid_grant" }, 400));
    const service = new AppleRevocationService((await makeConfig()) as never);
    await expect(service.revoke("viejo", "sub")).resolves.toBe("failed");

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ refresh_token: "r", id_token: await idToken("sub") }))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    await expect(service.revoke("codigo", "sub")).resolves.toBe("failed");
  });

  it("una caída de red o una llave inválida no lanza: informa la falla", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("sin red"));
    const service = new AppleRevocationService((await makeConfig()) as never);
    await expect(service.revoke("codigo", "sub")).resolves.toBe("failed");

    const broken = new AppleRevocationService((await makeConfig({ APPLE_PRIVATE_KEY: "no-es-una-llave" })) as never);
    await expect(broken.revoke("codigo", "sub")).resolves.toBe("failed");
  });

  it("el identificador de equipo y el de cliente pueden reemplazarse por variables", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ refresh_token: "r", id_token: await idToken("sub") }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    global.fetch = fetchMock;
    const service = new AppleRevocationService((await makeConfig({ APPLE_TEAM_ID: "EQUIPO12345", APPLE_CLIENT_ID: "app.otra" })) as never);
    await service.revoke("codigo", "sub");
    const secret = (fetchMock.mock.calls[0][1].body as URLSearchParams).get("client_secret") as string;
    expect(decodeJwt(secret)).toMatchObject({ iss: "EQUIPO12345", sub: "app.otra" });
  });
});
