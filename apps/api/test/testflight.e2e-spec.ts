import { generateKeyPairSync } from "crypto";
import { MailService } from "../src/mail/mail.service";
import { AppStoreConnectClient } from "../src/testflight/app-store-connect.client";
import { generateRawToken, hashToken } from "../src/auth/token.util";
import { CRON_SECRET, PASSWORD, PILOT_CODE, resetDatabase, startApp, type TestApp } from "./support/app";

// Invitación a TestFlight al registrarse con iPhone y correo con el acceso web para
// Android (CYC-194). Apple se simula interceptando `fetch`: nunca se le llama.

const GROUP = "grupo-piloto-e2e";
const ASC = "https://api.appstoreconnect.apple.com/v1";

type Reply = { status: number; body?: unknown };

describe("Invitación a TestFlight", () => {
  let app: TestApp;
  let fetchSpy: jest.SpyInstance;
  const calls: { method: string; url: string; body: Record<string, any> | null; auth: string }[] = [];
  let replies: Reply[] = [];
  let seq = 0;

  const apple = (...next: Reply[]) => {
    replies = next;
  };

  const register = (over: Record<string, unknown>) =>
    app
      .http("post", "/auth/register")
      .send({ name: "Atleta Prueba", email: `atleta${++seq}@e2e.test`, password: PASSWORD, role: "athlete", acceptPolicy: true, accessCode: PILOT_CODE, ...over });

  // Verifica el correo con un token válido y espera a que termine el trabajo en segundo plano.
  async function verify(email: string) {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { email } });
    const raw = generateRawToken();
    await app.prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 3_600_000) } });
    expect((await app.http("post", "/auth/verify-email").send({ token: raw })).status).toBe(200);
    await new Promise((r) => setTimeout(r, 400));
    return user.id;
  }
  const inviteOf = (userId: string) => app.prisma.betaInvite.findUnique({ where: { userId } });

  beforeAll(async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    process.env.APP_STORE_CONNECT_KEY_ID = "KEY123";
    process.env.APP_STORE_CONNECT_ISSUER_ID = "issuer-e2e";
    process.env.APP_STORE_CONNECT_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    process.env.TESTFLIGHT_GROUP_ID = GROUP;
    app = await startApp();
    await resetDatabase(app.prisma);
    fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (!url.startsWith(ASC)) throw new Error(`fetch inesperado: ${url}`);
      calls.push({
        method: String(init?.method),
        url: url.slice(ASC.length),
        body: init?.body ? JSON.parse(String(init.body)) : null,
        auth: String((init?.headers as Record<string, string>).Authorization),
      });
      const reply = replies.shift() ?? { status: 201, body: {} };
      return new Response(reply.status === 204 ? null : JSON.stringify(reply.body ?? {}), { status: reply.status });
    });
  });
  afterAll(async () => {
    fetchSpy?.mockRestore();
    for (const key of ["APP_STORE_CONNECT_KEY_ID", "APP_STORE_CONNECT_ISSUER_ID", "APP_STORE_CONNECT_PRIVATE_KEY", "TESTFLIGHT_GROUP_ID"]) delete process.env[key];
    await app?.close();
  });
  beforeEach(() => {
    calls.length = 0;
    replies = [];
  });

  it("iPhone: al verificar el correo se agrega al grupo Piloto con el correo del Apple ID", async () => {
    const res = await register({ phonePlatform: "ios", appleIdEmail: "Apple.ID@e2e.test" });
    expect(res.status).toBe(201);
    const user = await app.prisma.user.findUniqueOrThrow({ where: { email: res.body.email } });
    expect(user.phonePlatform).toBe("ios");
    // Antes de verificar solo queda anotada: no se llama a Apple.
    expect((await inviteOf(user.id))?.status).toBe("pending");
    expect(calls).toHaveLength(0);

    await verify(res.body.email);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST", url: "/betaTesters" });
    expect(calls[0].body?.data.attributes.email).toBe("apple.id@e2e.test");
    expect(calls[0].body?.data.relationships.betaGroups.data[0].id).toBe(GROUP);
    // Token firmado con ES256 (la llave nunca sale del servidor).
    const header = JSON.parse(Buffer.from(calls[0].auth.replace("Bearer ", "").split(".")[0], "base64url").toString());
    expect(header).toMatchObject({ alg: "ES256", kid: "KEY123" });
    expect(await inviteOf(user.id)).toMatchObject({ status: "invited", attempts: 1 });
  });

  it("sin escribir otro correo usa el de la cuenta", async () => {
    const res = await register({ phonePlatform: "ios" });
    const id = await verify(res.body.email);
    expect(calls[0].body?.data.attributes.email).toBe(res.body.email);
    expect((await inviteOf(id))?.status).toBe("invited");
  });

  it("un tester que ya existe en Apple se suma al grupo en vez de fallar", async () => {
    apple({ status: 409, body: { errors: [{ code: "ENTITY_ERROR" }] } }, { status: 200, body: { data: [{ id: "tester-1" }] } }, { status: 204 });
    const res = await register({ phonePlatform: "ios", appleIdEmail: "ya.existe@e2e.test" });
    const id = await verify(res.body.email);
    expect(calls.map((c) => `${c.method} ${c.url.split("?")[0]}`)).toEqual(["POST /betaTesters", "GET /betaTesters", `POST /betaGroups/${GROUP}/relationships/betaTesters`]);
    expect((await inviteOf(id))?.status).toBe("invited");
  });

  it("si Apple falla el registro no se bloquea: queda fallida y el reintento la invita", async () => {
    apple({ status: 500, body: { errors: [{ code: "UNEXPECTED_ERROR" }] } });
    const res = await register({ phonePlatform: "ios", appleIdEmail: "falla@e2e.test" });
    expect(res.status).toBe(201);
    const id = await verify(res.body.email);
    const failed = await inviteOf(id);
    expect(failed).toMatchObject({ status: "failed", attempts: 1 });
    expect(failed?.lastError).toContain("500");
    expect(failed?.lastError).not.toContain("falla@e2e.test");

    // El reintento exige el secreto interno.
    expect((await app.http("post", "/internal/testflight/retry")).status).toBe(401);
    calls.length = 0;
    const retry = await app.http("post", "/internal/testflight/retry", CRON_SECRET);
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ enabled: true, invited: 1, failed: 0 });
    expect(await inviteOf(id)).toMatchObject({ status: "invited", attempts: 2 });
    // Ya invitada: otro reintento no vuelve a llamar a Apple.
    calls.length = 0;
    await app.http("post", "/internal/testflight/retry", CRON_SECRET);
    expect(calls).toHaveLength(0);
  });

  it("no se invita dos veces al mismo correo de Apple", async () => {
    const first = await register({ phonePlatform: "ios", appleIdEmail: "repetido@e2e.test" });
    const second = await register({ phonePlatform: "ios", appleIdEmail: "repetido@e2e.test" });
    expect(second.status).toBe(201);
    await verify(first.body.email);
    await verify(second.body.email);
    expect(await app.prisma.betaInvite.count({ where: { email: "repetido@e2e.test" } })).toBe(1);
    expect(calls).toHaveLength(1);
  });

  it("Android: recibe el correo con el acceso web y no entra a TestFlight", async () => {
    const send = jest.spyOn(app.app.get(MailService), "sendAndroidAccessEmail").mockResolvedValue();
    const res = await register({ phonePlatform: "android" });
    const id = await verify(res.body.email);
    expect(send).toHaveBeenCalledWith(res.body.email);
    expect(await inviteOf(id)).toBeNull();
    expect(calls).toHaveLength(0);
    expect((await app.prisma.user.findUniqueOrThrow({ where: { id } })).phonePlatform).toBe("android");
    send.mockRestore();
  });

  it("un coach, o un atleta sin contestar, no genera invitación", async () => {
    const coach = await register({ role: "coach", phonePlatform: "ios", appleIdEmail: "coach.apple@e2e.test" });
    await verify(coach.body.email);
    const none = await register({});
    const id = await verify(none.body.email);
    expect(await inviteOf(id)).toBeNull();
    expect(await app.prisma.betaInvite.count({ where: { email: "coach.apple@e2e.test" } })).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("las cuentas demo nunca se invitan", async () => {
    const demo = await app.prisma.user.create({ data: { email: "demo@e2e.test", name: "Demo", role: "athlete", isDemo: true, emailVerifiedAt: new Date() } });
    await app.prisma.betaInvite.create({ data: { userId: demo.id, email: "demo.apple@e2e.test" } });
    await app.http("post", "/internal/testflight/retry", CRON_SECRET);
    expect(calls).toHaveLength(0);
    expect((await inviteOf(demo.id))?.status).toBe("pending");
  });

  it("sin la llave de Apple todo queda pendiente y el registro funciona igual", async () => {
    const off = jest.spyOn(app.app.get(AppStoreConnectClient), "enabled", "get").mockReturnValue(false);
    const res = await register({ phonePlatform: "ios", appleIdEmail: "sin.llave@e2e.test" });
    expect(res.status).toBe(201);
    const id = await verify(res.body.email);
    expect((await inviteOf(id))?.status).toBe("pending");
    expect(calls).toHaveLength(0);
    expect((await app.http("post", "/internal/testflight/retry", CRON_SECRET)).body).toEqual({ enabled: false, invited: 0, failed: 0 });
    off.mockRestore();
  });
});
