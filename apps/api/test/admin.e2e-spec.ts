import { exportJWK, generateKeyPair, createLocalJWKSet, SignJWT, type JWK, type JWTVerifyGetKey, type KeyLike } from "jose";
import { AccessTokenVerifier } from "../src/admin/access-token.verifier";
import { PASSWORD, resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Portal del equipo (CYC-193): todo /admin/* exige el token de Cloudflare Access
// y muestra solo lo mínimo de cada cuenta. Las claves de Cloudflare se
// reemplazan por un par de claves de prueba.

const TEAM = "equipo-e2e.cloudflareaccess.com";
const AUD = "aud-e2e-0123456789abcdef";
const ISSUER = `https://${TEAM}`;

let privateKey: KeyLike;
let otherKey: KeyLike;
let jwks: JWTVerifyGetKey;

class TestVerifier extends AccessTokenVerifier {
  protected resolveKeys(): JWTVerifyGetKey {
    return jwks;
  }
}

async function accessToken(claims: { email?: string; aud?: string; iss?: string; exp?: string | number; key?: KeyLike } = {}): Promise<string> {
  const jwt = new SignJWT(claims.email === undefined && "email" in claims ? {} : { email: claims.email ?? "equipo@e2e.test" })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(claims.iss ?? ISSUER)
    .setAudience(claims.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "5m");
  return jwt.sign(claims.key ?? privateKey);
}

describe("Portal del equipo (/admin)", () => {
  let app: TestApp;
  let c: Scenario;
  let defaultToken = "";
  // Con el token de un integrante del equipo (síncrono, para encadenar `.send`).
  const admin = (method: "get" | "post" | "put" | "delete", path: string) =>
    app.http(method as "get", path).set("Cf-Access-Jwt-Assertion", defaultToken);
  // Con un token a medida (otra audiencia, vencido, otro correo…).
  const adminAs = async (claims: Parameters<typeof accessToken>[0], method: "get" | "post" | "put" | "delete", path: string) =>
    app.http(method as "get", path).set("Cf-Access-Jwt-Assertion", await accessToken(claims));

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    privateKey = pair.privateKey;
    otherKey = (await generateKeyPair("RS256")).privateKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
    jwks = createLocalJWKSet({ keys: [jwk] });

    process.env.CF_ACCESS_TEAM_DOMAIN = TEAM;
    process.env.CF_ACCESS_AUD = AUD;
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_prueba_e2e";
    process.env.POSTHOG_PROJECT_ID = "123";
    defaultToken = await accessToken();
    app = await startApp({
      configure: (builder) => builder.overrideProvider(AccessTokenVerifier).useFactory({ factory: (config) => new TestVerifier(config), inject: [require("@nestjs/config").ConfigService] }),
    });
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    delete process.env.CF_ACCESS_TEAM_DOMAIN;
    delete process.env.CF_ACCESS_AUD;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
    delete process.env.POSTHOG_PROJECT_ID;
    await app?.close();
  });

  const routes: Array<["get" | "post" | "put" | "delete", string]> = [
    ["get", "/admin/session"],
    ["get", "/admin/users"],
    ["get", "/admin/users/x"],
    ["get", "/admin/summary"],
    ["get", "/admin/usage"],
    ["get", "/admin/access-log"],
    ["get", "/admin/emails"],
    ["post", "/admin/emails"],
    ["put", "/admin/emails/x"],
    ["delete", "/admin/emails/x"],
    ["get", "/admin/versions"],
    ["put", "/admin/settings/ios-version"],
  ];

  describe("acceso", () => {
    it.each(routes)("%s %s sin el token de Access da 401", async (method, path) => {
      expect((await app.http(method as "get", path)).status).toBe(401);
    });

    it("un token de la app (coach) no sirve", async () => {
      for (const who of ["coachA", "athleteA"] as const) {
        const res = await app.http("get", "/admin/users", c.token[who]);
        expect(res.status).toBe(401);
      }
      // Ni siquiera mandándolo en la cabecera de Access.
      const res = await app.http("get", "/admin/users").set("Cf-Access-Jwt-Assertion", c.token.coachA);
      expect(res.status).toBe(401);
    });

    it.each([
      ["con otra audiencia", { aud: "otra-aplicacion" }],
      ["de otro emisor", { iss: "https://otro.cloudflareaccess.com" }],
      ["vencido", { exp: Math.floor(Date.now() / 1000) - 60 }],
      ["firmado con otra clave", { key: "other" as const }],
      ["sin correo (token de máquina)", { email: undefined }],
    ])("un token %s da 401", async (_caso, claims) => {
      const resolved = "key" in claims ? { key: otherKey } : claims;
      const res = await adminAs(resolved as Parameters<typeof accessToken>[0], "get", "/admin/session");
      expect(res.status).toBe(401);
    });

    it("un token basura da 401", async () => {
      const res = await app.http("get", "/admin/session").set("Cf-Access-Jwt-Assertion", "no-es-un-jwt");
      expect(res.status).toBe(401);
    });

    it("un token válido entra y el correo sale del token, en minúsculas", async () => {
      const res = await adminAs({ email: "Equipo@E2E.test" }, "get", "/admin/session");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ email: "equipo@e2e.test" });
    });
  });

  describe("usuarios", () => {
    beforeAll(async () => {
      await app.prisma.user.create({ data: { email: "demo.uno@e2e.test", name: "Demo Uno", role: "coach", isDemo: true, emailVerifiedAt: new Date() } });
      await app.prisma.user.create({ data: { email: "demo.dos@e2e.test", name: "Demo Dos", role: "athlete", isDemo: true } });
    });

    it("la lista de cuentas reales no trae las demo, y la de demo solo trae demo", async () => {
      const real = (await admin("get", "/admin/users?kind=real")).body;
      const demo = (await admin("get", "/admin/users?kind=demo")).body;
      expect(real.total).toBe(5);
      expect(real.items.every((u: { isDemo: boolean }) => !u.isDemo)).toBe(true);
      expect(demo.total).toBe(2);
      expect(demo.items.every((u: { isDemo: boolean }) => u.isDemo)).toBe(true);
    });

    it("por defecto muestra las cuentas reales", async () => {
      const res = await admin("get", "/admin/users");
      expect(res.body.total).toBe(5);
    });

    it("nunca expone contraseñas, tokens ni datos de entrenamiento", async () => {
      const list = JSON.stringify((await admin("get", "/admin/users")).body);
      const detail = JSON.stringify((await admin("get", `/admin/users/${c.userId.coachA}`)).body);
      for (const text of [list, detail]) {
        expect(text).not.toMatch(/passwordHash|\$2[aby]\$|refreshToken|token/i);
        expect(text).not.toMatch(/painNotes|weight|reps/i);
      }
    });

    it("filtra por rol, por verificación y por búsqueda", async () => {
      expect((await admin("get", "/admin/users?role=coach")).body.total).toBe(2);
      expect((await admin("get", "/admin/users?kind=demo&verified=no")).body.total).toBe(1);
      expect((await admin("get", "/admin/users?q=atleta%20a")).body.total).toBe(1);
      expect((await admin("get", "/admin/users?q=COACH.B@")).body.items[0].email).toBe("coach.b@e2e.test");
    });

    it("informa la política aceptada y la vigente", async () => {
      await app.prisma.policyAcceptance.create({ data: { userId: c.userId.coachA, version: "1.2", source: "register" } });
      const body = (await admin("get", "/admin/users?q=coach.a@")).body;
      expect(body.items[0].policy).toBe("1.2");
      expect(typeof body.currentPolicy).toBe("string");
    });

    it("el detalle trae la relación coach–atleta", async () => {
      const body = (await admin("get", `/admin/users/${c.userId.coachA}`)).body;
      expect(body.athletes.map((a: { name: string }) => a.name).sort()).toEqual(["Atleta A", "Atleta C"]);
      expect((await admin("get", "/admin/users/no-existe")).status).toBe(404);
    });

    it("valida los parámetros", async () => {
      expect((await admin("get", "/admin/users?page=0")).status).toBe(400);
      expect((await admin("get", "/admin/users?kind=todos")).status).toBe(400);
      expect((await admin("get", "/admin/users?role=admin")).status).toBe(400);
    });

    it("el resumen cuenta solo cuentas reales; las demo van aparte", async () => {
      const body = (await admin("get", "/admin/summary")).body;
      expect(body.real).toEqual({ total: 5, coaches: 2, athletes: 3 });
      expect(body.demo.total).toBe(2);
      expect(body.coachesWithInvitedAthletes.count).toBe(2);
      expect(body.registrations.last7Days).toBe(5);
    });
  });

  describe("registro de consultas", () => {
    it("cada consulta de usuarios queda registrada con el correo del token", async () => {
      await adminAs({ email: "revisora@e2e.test" }, "get", "/admin/users");
      await adminAs({ email: "revisora@e2e.test" }, "get", `/admin/users/${c.userId.athleteA}`);
      const log = (await admin("get", "/admin/access-log")).body as Array<{ email: string; view: string }>;
      expect(log.filter((l) => l.email === "revisora@e2e.test").map((l) => l.view).sort()).toEqual(["user-detail", "users"]);
    });
  });

  describe("directorio de correos", () => {
    const body = { address: "Prueba@Getcycles.app", purpose: "Pruebas", mode: "both", service: "Cloudflare Email Routing" };

    it("crea, lista, edita y quita una dirección", async () => {
      const created = await admin("post", "/admin/emails").send(body);
      expect(created.status).toBe(201);
      expect(created.body.address).toBe("prueba@getcycles.app");

      expect((await admin("get", "/admin/emails")).body.map((e: { address: string }) => e.address)).toContain("prueba@getcycles.app");

      const edited = await admin("put", `/admin/emails/${created.body.id}`).send({ ...body, purpose: "Pruebas 2", mode: "receive" });
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject({ purpose: "Pruebas 2", mode: "receive" });

      expect((await admin("delete", `/admin/emails/${created.body.id}`)).status).toBe(204);
      expect((await admin("delete", `/admin/emails/${created.body.id}`)).status).toBe(404);
    });

    it("rechaza una dirección repetida (409) y datos inválidos (400)", async () => {
      await admin("post", "/admin/emails").send({ ...body, address: "repetida@getcycles.app" });
      expect((await admin("post", "/admin/emails").send({ ...body, address: "repetida@getcycles.app" })).status).toBe(409);
      expect((await admin("post", "/admin/emails").send({ ...body, address: "sin-arroba" })).status).toBe(400);
      expect((await admin("post", "/admin/emails").send({ ...body, mode: "otro" })).status).toBe(400);
      expect((await admin("post", "/admin/emails").send({ ...body, purpose: "" })).status).toBe(400);
    });
  });

  describe("versiones", () => {
    it("informa la política vigente y la última migración, y guarda la versión de iOS", async () => {
      const first = (await admin("get", "/admin/versions")).body;
      expect(first.policyVersion).toMatch(/^\d+\.\d+$/);
      expect(first.ios.version).toBeNull();
      expect((await admin("put", "/admin/settings/ios-version").send({ value: "1.0 (42)" })).body).toEqual({ version: "1.0 (42)" });
      expect((await admin("get", "/admin/versions")).body.ios.version).toBe("1.0 (42)");
      expect((await admin("put", "/admin/settings/ios-version").send({ value: " " })).body).toEqual({ version: null });
    });
  });

  describe("uso (PostHog)", () => {
    afterEach(() => jest.restoreAllMocks());

    it("sin clave configurada informa «no conectado»", async () => {
      delete process.env.POSTHOG_PERSONAL_API_KEY;
      // El servicio lee la configuración al consultar: sin clave, no hay llamada.
      const { ConfigService } = await import("@nestjs/config");
      const config = app.app.get(ConfigService);
      const spy = jest.spyOn(config, "get").mockImplementation((key: string) => (key === "POSTHOG_PERSONAL_API_KEY" ? undefined : process.env[key]) as never);
      const res = await admin("get", "/admin/usage");
      spy.mockRestore();
      process.env.POSTHOG_PERSONAL_API_KEY = "phx_prueba_e2e";
      expect(res.body).toEqual({ status: "not_connected" });
    });

    it("excluye las cuentas demo de la consulta y cruza el nombre en el servidor", async () => {
      const demo = await app.prisma.user.findFirstOrThrow({ where: { isDemo: true } });
      const queries: string[] = [];
      jest.spyOn(global, "fetch").mockImplementation((async (_url: unknown, init?: { body?: string }) => {
        const query = JSON.parse(init?.body ?? "{}").query.query as string;
        queries.push(query);
        const results = query.includes("distinct_id,")
          ? [
              [c.userId.coachA, 10, 2, 1, 1, 0, 0, 1, "2026-11-03T10:00:00Z"],
              [demo.id, 99, 9, 9, 9, 9, 9, 9, "2026-11-03T10:00:00Z"],
              ["00000000-0000-4000-8000-000000000000", 5, 1, 0, 0, 0, 0, 0, null],
            ]
          : [["/athletes", 7]];
        return { ok: true, json: async () => ({ results }) } as Response;
      }) as typeof fetch);

      const res = await admin("get", "/admin/usage?days=30");
      expect(res.status).toBe(200);
      expect(queries.every((q) => q.includes(demo.id) && q.includes("INTERVAL 30 DAY"))).toBe(true);
      // Solo personas de la base y no demo; con su nombre, que PostHog nunca tuvo.
      expect(res.body.users.map((u: { name: string }) => u.name)).toEqual(["Coach A"]);
      expect(res.body.users[0]).toMatchObject({ visits: 10, tourSkipped: 1 });
      expect(res.body.screens).toEqual([{ path: "/athletes", visits: 7 }]);
    });

    it("si PostHog falla responde 503 con un código, sin detalles", async () => {
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("clave phx_prueba_e2e inválida"));
      const res = await admin("get", "/admin/usage");
      expect(res.status).toBe(503);
      expect(JSON.stringify(res.body)).not.toContain("phx_");
      expect(res.body.code).toBe("posthog_error");
    });

    it("valida el periodo", async () => {
      expect((await admin("get", "/admin/usage?days=14")).status).toBe(400);
    });
  });

  describe("último ingreso", () => {
    const lastLogin = async () => (await app.prisma.user.findUniqueOrThrow({ where: { id: c.userId.coachB } })).lastLoginAt;

    it("se guarda al iniciar sesión y no cambia al renovarla", async () => {
      await app.prisma.user.update({ where: { id: c.userId.coachB }, data: { lastLoginAt: null } });

      const login = await app.http("post", "/auth/login").send({ email: "coach.b@e2e.test", password: PASSWORD });
      expect(login.status).toBeLessThan(300);
      const afterLogin = await lastLogin();
      expect(afterLogin).toBeInstanceOf(Date);

      await new Promise((r) => setTimeout(r, 30));
      const refreshed = await app.http("post", "/auth/refresh").send({ refreshToken: login.body.refreshToken });
      expect(refreshed.status).toBeLessThan(300);
      expect((await lastLogin())?.getTime()).toBe(afterLogin?.getTime());
    });

    it("un ingreso nuevo la actualiza", async () => {
      const before = await lastLogin();
      await new Promise((r) => setTimeout(r, 30));
      await app.http("post", "/auth/login").send({ email: "coach.b@e2e.test", password: PASSWORD });
      expect((await lastLogin())!.getTime()).toBeGreaterThan(before!.getTime());
    });

    it("un intento fallido no la toca", async () => {
      const before = await lastLogin();
      expect((await app.http("post", "/auth/login").send({ email: "coach.b@e2e.test", password: "incorrecta-123" })).status).toBe(401);
      expect((await lastLogin())?.getTime()).toBe(before?.getTime());
    });
  });
});
