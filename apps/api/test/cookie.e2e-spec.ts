import { randomBytes } from "crypto";
import { hashToken } from "../src/auth/token.util";
import { PASSWORD, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Refresh token de la web en una cookie httpOnly (CYC-89, S-08 · R2).
//   - La web (cabecera X-Cycles-Client: web) recibe el refresh en la cookie y NUNCA en el cuerpo.
//   - La app móvil (sin cabecera) sigue recibiéndolo en el cuerpo y la API ignora cualquier cookie.
//   - Lo que se autentica con la cookie exige un Origin de la lista de CORS (CSRF).

const WEB_ORIGIN = "http://localhost:5173"; // = FRONTEND_URL del arnés
const WEB = { "X-Cycles-Client": "web" };

type Http = ReturnType<TestApp["http"]>;
const asWeb = (req: Http, origin: string | null = WEB_ORIGIN) => {
  req.set(WEB);
  if (origin) req.set("Origin", origin);
  return req;
};
const setCookies = (res: { headers: Record<string, unknown> }): string[] => {
  const raw = res.headers["set-cookie"];
  return Array.isArray(raw) ? (raw as string[]) : raw ? [String(raw)] : [];
};
const refreshCookie = (res: { headers: Record<string, unknown> }) => setCookies(res).find((c) => c.startsWith("cycles_rt="));
// «cycles_rt=<valor>» listo para mandar como cabecera Cookie.
const cookieHeader = (res: { headers: Record<string, unknown> }) => refreshCookie(res)!.split(";")[0];

describe("Refresh token en cookie httpOnly", () => {
  let app: TestApp;
  let c: Scenario;

  // Cada prueba usa su propia cuenta: el login limita 5 intentos por minuto por correo.
  let accounts = 0;
  const account = async (): Promise<string> => {
    accounts += 1;
    const email = `cookie${accounts}@e2e.test`;
    await app.prisma.user.create({
      data: { email, name: `Cookie ${accounts}`, role: "coach", passwordHash: await passwordHash(), emailVerifiedAt: new Date() },
    });
    return email;
  };
  const webLogin = (email: string) => asWeb(app.http("post", "/auth/login")).send({ email, password: PASSWORD });
  const mobileLogin = (email: string) => app.http("post", "/auth/login").send({ email, password: PASSWORD });

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("login de la web", () => {
    it("pone la cookie con sus atributos y no devuelve el refresh token en el cuerpo", async () => {
      const res = await webLogin(await account());
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body).not.toHaveProperty("refreshToken");
      const cookie = refreshCookie(res)!;
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).toMatch(/Path=\/auth(;|$)/);
      expect(cookie).toMatch(/Max-Age=2592000|Expires=/);
      expect(cookie).not.toMatch(/Domain=/i); // solo para api.getcycles.app
      // En pruebas no es producción: sin Secure (en producción sí; ver el test unitario).
      expect(JSON.stringify(res.body)).not.toContain(cookieHeader(res).split("=")[1]);
    });

    it("la app móvil (sin la cabecera) sigue recibiendo ambos tokens en el cuerpo y sin cookie", async () => {
      const res = await mobileLogin(await account());
      expect(res.status).toBe(200);
      expect(res.body.refreshToken).toBeTruthy();
      expect(refreshCookie(res)).toBeUndefined();
    });

    it("una contraseña mala no pone cookie", async () => {
      const res = await asWeb(app.http("post", "/auth/login")).send({ email: await account(), password: "mala-clave-1" });
      expect(res.status).toBe(401);
      expect(refreshCookie(res)).toBeUndefined();
    });
  });

  describe("refresh con la cookie", () => {
    it("entrega un access token nuevo, rota la cookie y no pone el refresh en el cuerpo", async () => {
      const login = await webLogin(await account());
      const first = cookieHeader(login);
      const res = await asWeb(app.http("post", "/auth/refresh")).set("Cookie", first).send({});
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body).not.toHaveProperty("refreshToken");
      const second = cookieHeader(res);
      expect(second).not.toBe(first);
      // El access token nuevo sirve.
      expect((await app.http("get", "/users/me", res.body.accessToken)).status).toBe(200);
      // El token anterior ya no sirve y su reuso revoca todas las sesiones (R2).
      const reuse = await asWeb(app.http("post", "/auth/refresh")).set("Cookie", first).send({});
      expect(reuse.status).toBe(401);
      expect((await asWeb(app.http("post", "/auth/refresh")).set("Cookie", second).send({})).status).toBe(401);
    });

    it("sin cookie da 401", async () => {
      expect((await asWeb(app.http("post", "/auth/refresh")).send({})).status).toBe(401);
    });

    it("con una cookie inventada da 401 y la borra", async () => {
      const res = await asWeb(app.http("post", "/auth/refresh")).set("Cookie", "cycles_rt=no-es-un-token").send({});
      expect(res.status).toBe(401);
      expect(refreshCookie(res)).toMatch(/cycles_rt=;/);
    });

    it("CSRF: con la cookie, un Origin ajeno o la ausencia de Origin dan 403", async () => {
      const cookie = cookieHeader(await webLogin(await account()));
      const foreign = await asWeb(app.http("post", "/auth/refresh"), "https://sitio-malo.example").set("Cookie", cookie).send({});
      const none = await asWeb(app.http("post", "/auth/refresh"), null).set("Cookie", cookie).send({});
      expect(foreign.status).toBe(403);
      expect(none.status).toBe(403);
      // La cookie no se gastó: el pedido legítimo siguiente funciona.
      expect((await asWeb(app.http("post", "/auth/refresh")).set("Cookie", cookie).send({})).status).toBe(200);
    });

    it("sin la cabecera de la web la cookie se ignora (un script no puede pedir el token en el cuerpo)", async () => {
      const cookie = cookieHeader(await webLogin(await account()));
      const res = await app.http("post", "/auth/refresh").set("Cookie", cookie).set("Origin", WEB_ORIGIN).send({});
      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty("refreshToken");
    });

    it("la app móvil refresca con el token en el cuerpo, como siempre", async () => {
      const tokens = (await mobileLogin(await account())).body;
      const res = await app.http("post", "/auth/refresh").send({ refreshToken: tokens.refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.refreshToken).toBeTruthy();
      expect(refreshCookie(res)).toBeUndefined();
    });
  });

  describe("puente para sesiones guardadas antes de la cookie", () => {
    it("la web cambia el refresh token viejo (cuerpo) por la cookie y no lo devuelve", async () => {
      const legacy = (await mobileLogin(await account())).body;
      const res = await asWeb(app.http("post", "/auth/refresh")).send({ refreshToken: legacy.refreshToken });
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("refreshToken");
      expect(refreshCookie(res)).toBeDefined();
      // El token viejo quedó gastado.
      expect((await app.http("post", "/auth/refresh").send({ refreshToken: legacy.refreshToken })).status).toBe(401);
    });
  });

  describe("logout", () => {
    it("borra la cookie y revoca el refresh token", async () => {
      const cookie = cookieHeader(await webLogin(await account()));
      const out = await asWeb(app.http("post", "/auth/logout")).set("Cookie", cookie).send({});
      expect(out.status).toBe(204);
      expect(refreshCookie(out)).toMatch(/cycles_rt=;/);
      expect((await asWeb(app.http("post", "/auth/refresh")).set("Cookie", cookie).send({})).status).toBe(401);
    });

    it("con un Origin ajeno da 403 y no revoca nada", async () => {
      const cookie = cookieHeader(await webLogin(await account()));
      const out = await asWeb(app.http("post", "/auth/logout"), "https://sitio-malo.example").set("Cookie", cookie).send({});
      expect(out.status).toBe(403);
      expect((await asWeb(app.http("post", "/auth/refresh")).set("Cookie", cookie).send({})).status).toBe(200);
    });

    it("sin sesión en la web no falla (borra la cookie igual)", async () => {
      expect((await asWeb(app.http("post", "/auth/logout")).send({})).status).toBe(204);
    });

    it("la app móvil sigue cerrando sesión con el token en el cuerpo, y sin él da 400", async () => {
      const tokens = (await mobileLogin(await account())).body;
      expect((await app.http("post", "/auth/logout").send({ refreshToken: tokens.refreshToken })).status).toBe(204);
      expect((await app.http("post", "/auth/logout").send({})).status).toBe(400);
    });
  });

  describe("código de Google y aceptar invitación", () => {
    it("el intercambio del código de Google pone la cookie en la web", async () => {
      const raw = randomBytes(32).toString("hex");
      await app.prisma.oAuthExchangeCode.create({
        data: { userId: c.userId.coachA, codeHash: hashToken(raw), expiresAt: new Date(Date.now() + 60_000) },
      });
      const res = await asWeb(app.http("post", "/auth/google/exchange")).send({ code: raw });
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("refreshToken");
      expect(refreshCookie(res)).toBeDefined();
    });

    it("aceptar la invitación pone la cookie en la web y el cuerpo en el móvil", async () => {
      const make = async (email: string) => {
        const athlete = await app.prisma.user.create({ data: { email, name: "Nuevo", role: "athlete" } });
        const relation = await app.prisma.coachAthlete.create({ data: { coachId: c.userId.coachA, athleteId: athlete.id, status: "pending" } });
        const raw = randomBytes(32).toString("hex");
        await app.prisma.athleteInvitationToken.create({
          data: { coachAthleteId: relation.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 3_600_000) },
        });
        return raw;
      };
      const web = await asWeb(app.http("post", "/athletes/invitations/accept")).send({
        token: await make("nuevo.web@e2e.test"), password: "contraseña-larga-1", acceptPolicy: true,
      });
      expect(web.status).toBe(200);
      expect(web.body).not.toHaveProperty("refreshToken");
      expect(refreshCookie(web)).toBeDefined();
      const mobile = await app.http("post", "/athletes/invitations/accept").send({
        token: await make("nuevo.movil@e2e.test"), password: "contraseña-larga-1", acceptPolicy: true,
      });
      expect(mobile.status).toBe(200);
      expect(mobile.body.refreshToken).toBeTruthy();
      expect(refreshCookie(mobile)).toBeUndefined();
    });
  });

  describe("CORS con credenciales", () => {
    it("permite credenciales solo para la web de Cycles", async () => {
      const ok = await app.http("post", "/auth/refresh").set("Origin", WEB_ORIGIN).send({});
      expect(ok.headers["access-control-allow-origin"]).toBe(WEB_ORIGIN);
      expect(ok.headers["access-control-allow-credentials"]).toBe("true");
      const bad = await app.http("post", "/auth/refresh").set("Origin", "https://sitio-malo.example").send({});
      expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("la petición previa (preflight) acepta la cabecera de la web", async () => {
      const res = await app
        .http("options", "/auth/refresh")
        .set("Origin", WEB_ORIGIN)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type,x-cycles-client");
      expect(res.status).toBeLessThan(300);
      expect(String(res.headers["access-control-allow-headers"]).toLowerCase()).toContain("x-cycles-client");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });
  });
});
