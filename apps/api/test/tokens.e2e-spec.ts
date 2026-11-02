import { randomBytes } from "crypto";
import { JwtService } from "@nestjs/jwt";
import { hashToken } from "../src/auth/token.util";
import { CRON_SECRET, PASSWORD, PILOT_CODE, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Flujos de token y de entrada (CYC-90, S-11 · R2): reuso de refresh, código de
// Google usado o vencido, reset vencido o usado, tokens alterados y registro.

const HOUR = 3_600_000;
const login = (app: TestApp, email: string, password = PASSWORD) => app.http("post", "/auth/login").send({ email, password });

describe("Flujos de token y de entrada", () => {
  let app: TestApp;
  let c: Scenario;
  const jwt = new JwtService({});

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("login", () => {
    it("una contraseña incorrecta y un correo inexistente responden igual (no revela si la cuenta existe)", async () => {
      const wrongPassword = await login(app, "coach.a@e2e.test", "otra-contraseña");
      const unknownEmail = await login(app, "nadie@e2e.test");
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it("sin verificar el correo no entra", async () => {
      await app.prisma.user.create({
        data: { email: "sin.verificar@e2e.test", name: "Sin verificar", role: "coach", passwordHash: await passwordHash() },
      });
      expect((await login(app, "sin.verificar@e2e.test")).status).toBe(403);
    });
  });

  describe("refresh token", () => {
    it("rota: el token usado deja de servir y el nuevo sí", async () => {
      const first = (await login(app, "atleta.a@e2e.test")).body;
      const second = await app.http("post", "/auth/refresh").send({ refreshToken: first.refreshToken });
      expect(second.status).toBeLessThan(300);
      expect(second.body.refreshToken).not.toBe(first.refreshToken);
      expect((await app.http("post", "/auth/refresh").send({ refreshToken: second.body.refreshToken })).status).toBeLessThan(300);
    });

    it("reusar un token ya rotado revoca todas las sesiones de esa persona", async () => {
      const first = (await login(app, "atleta.b@e2e.test")).body;
      const rotated = (await app.http("post", "/auth/refresh").send({ refreshToken: first.refreshToken })).body;
      const otherDevice = (await login(app, "atleta.b@e2e.test")).body;

      const reuse = await app.http("post", "/auth/refresh").send({ refreshToken: first.refreshToken });
      expect(reuse.status).toBe(401);
      // El token que salió de la rotación y el de otro dispositivo también quedaron revocados.
      expect((await app.http("post", "/auth/refresh").send({ refreshToken: rotated.refreshToken })).status).toBe(401);
      expect((await app.http("post", "/auth/refresh").send({ refreshToken: otherDevice.refreshToken })).status).toBe(401);
    });

    it("después de cerrar sesión el refresh token ya no sirve", async () => {
      const tokens = (await login(app, "atleta.c@e2e.test")).body;
      const out = await app.http("post", "/auth/logout").send({ refreshToken: tokens.refreshToken });
      expect(out.status).toBeLessThan(300);
      expect((await app.http("post", "/auth/refresh").send({ refreshToken: tokens.refreshToken })).status).toBe(401);
    });

    it("un refresh token inventado, alterado o firmado con otro secreto da 401", async () => {
      const tokens = (await login(app, "coach.b@e2e.test")).body;
      const tampered = `${tokens.refreshToken.slice(0, -4)}AAAA`;
      const foreign = jwt.sign({ sub: c.userId.coachB }, { secret: randomBytes(40).toString("hex"), expiresIn: "1h" });
      for (const refreshToken of ["no-es-un-token", tampered, foreign]) {
        expect((await app.http("post", "/auth/refresh").send({ refreshToken })).status).toBe(401);
      }
    });

    it("un access token no sirve como refresh token, y al revés", async () => {
      const tokens = (await login(app, "coach.a@e2e.test")).body;
      expect((await app.http("post", "/auth/refresh").send({ refreshToken: tokens.accessToken })).status).toBe(401);
      expect((await app.http("get", "/users/me", tokens.refreshToken)).status).toBe(401);
    });
  });

  describe("access token", () => {
    const claims = () => ({ sub: c.userId.coachA, email: "coach.a@e2e.test", role: "coach" });

    it("uno vigente funciona", async () => {
      expect((await app.http("get", "/users/me", c.token.coachA)).status).toBe(200);
    });

    it("uno vencido da 401", async () => {
      const expired = jwt.sign(claims(), { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "-10s" });
      expect((await app.http("get", "/users/me", expired)).status).toBe(401);
    });

    it("uno firmado con otro secreto da 401", async () => {
      const forged = jwt.sign(claims(), { secret: randomBytes(40).toString("hex"), expiresIn: "15m" });
      expect((await app.http("get", "/users/me", forged)).status).toBe(401);
    });

    it("uno sin firma (alg none) da 401", async () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ ...claims(), exp: Math.floor(Date.now() / 1000) + 900 })}.`;
      expect((await app.http("get", "/users/me", unsigned)).status).toBe(401);
    });

    it("cambiar el rol dentro de un token firmado invalida la firma (un atleta no se vuelve coach)", async () => {
      // Un atleta que edita su token para decir «coach» invalida la firma.
      const [head, , sig] = c.token.athleteA.split(".");
      const payload = Buffer.from(JSON.stringify({ sub: c.userId.athleteA, email: "atleta.a@e2e.test", role: "coach" })).toString("base64url");
      expect((await app.http("get", "/coach/attention", `${head}.${payload}.${sig}`)).status).toBe(401);
    });
  });

  describe("código de Google (intercambio de un solo uso)", () => {
    const createCode = async (expiresInMs: number) => {
      const raw = randomBytes(32).toString("hex");
      await app.prisma.oAuthExchangeCode.create({
        data: { userId: c.userId.coachA, codeHash: hashToken(raw), expiresAt: new Date(Date.now() + expiresInMs) },
      });
      return raw;
    };

    it("sirve una vez; la segunda da 401", async () => {
      const code = await createCode(60_000);
      const first = await app.http("post", "/auth/google/exchange").send({ code });
      expect(first.status).toBeLessThan(300);
      expect(first.body.accessToken).toBeTruthy();
      expect((await app.http("post", "/auth/google/exchange").send({ code })).status).toBe(401);
    });

    it("dos pedidos simultáneos con el mismo código: solo uno entra", async () => {
      const code = await createCode(60_000);
      const results = await Promise.all([1, 2, 3].map(() => app.http("post", "/auth/google/exchange").send({ code })));
      expect(results.filter((r) => r.status < 300)).toHaveLength(1);
    });

    it("uno vencido o inventado da 401", async () => {
      const expired = await createCode(-1_000);
      expect((await app.http("post", "/auth/google/exchange").send({ code: expired })).status).toBe(401);
      expect((await app.http("post", "/auth/google/exchange").send({ code: randomBytes(32).toString("hex") })).status).toBe(401);
    });
  });

  describe("recuperación de contraseña", () => {
    const createToken = async (email: string, offsetMs: number, usedAt?: Date) => {
      const user = await app.prisma.user.findUniqueOrThrow({ where: { email } });
      const raw = randomBytes(32).toString("hex");
      await app.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + offsetMs), usedAt },
      });
      return raw;
    };

    it("un enlace vencido, usado o inventado da 401", async () => {
      const expired = await createToken("coach.a@e2e.test", -HOUR);
      const used = await createToken("coach.a@e2e.test", HOUR, new Date());
      for (const token of [expired, used, "inventado"]) {
        expect((await app.http("post", "/auth/password-reset/confirm").send({ token, newPassword: "otra-clave-123" })).status).toBe(401);
      }
      // La contraseña no cambió.
      expect((await login(app, "coach.a@e2e.test")).status).toBeLessThan(300);
    });

    it("uno vigente cambia la contraseña, revoca las sesiones y no se puede reusar", async () => {
      const before = (await login(app, "coach.b@e2e.test")).body;
      const token = await createToken("coach.b@e2e.test", HOUR);
      const confirm = await app.http("post", "/auth/password-reset/confirm").send({ token, newPassword: "otra-clave-123" });
      expect(confirm.status).toBeLessThan(300);

      expect((await app.http("post", "/auth/refresh").send({ refreshToken: before.refreshToken })).status).toBe(401);
      expect((await login(app, "coach.b@e2e.test")).status).toBe(401); // la anterior ya no vale
      expect((await login(app, "coach.b@e2e.test", "otra-clave-123")).status).toBeLessThan(300);
      expect((await app.http("post", "/auth/password-reset/confirm").send({ token, newPassword: "tercera-clave-1" })).status).toBe(401);
    });
  });

  describe("verificación de correo", () => {
    it("un enlace inventado da 401", async () => {
      expect((await app.http("post", "/auth/verify-email").send({ token: "inventado" })).status).toBe(401);
    });
  });

  describe("registro (cerrado durante el piloto)", () => {
    const body = (extra: object = {}) => ({
      email: `nuevo-${randomBytes(4).toString("hex")}@e2e.test`,
      password: "contraseña-larga-1",
      name: "Nuevo",
      role: "coach",
      acceptPolicy: true,
      ...extra,
    });

    it("sin código del piloto da 403", async () => {
      expect((await app.http("post", "/auth/register").send(body())).status).toBe(403);
    });

    it("con un código incorrecto da 403", async () => {
      expect((await app.http("post", "/auth/register").send(body({ accessCode: "codigo-que-no-es-0123456789" }))).status).toBe(403);
    });

    it("con el código del piloto crea una cuenta de coach", async () => {
      const res = await app.http("post", "/auth/register").send(body({ accessCode: PILOT_CODE }));
      expect(res.status).toBe(201);
      const created = await app.prisma.user.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(created.role).toBe("coach");
    });

    it("un atleta tampoco se registra sin el código del piloto (403)", async () => {
      expect((await app.http("post", "/auth/register").send(body({ role: "athlete" }))).status).toBe(403);
    });

    it("con el código del piloto, un atleta se registra solo y queda sin coach (CYC-187)", async () => {
      const res = await app.http("post", "/auth/register").send(body({ role: "athlete", accessCode: PILOT_CODE }));
      expect(res.status).toBe(201);
      const created = await app.prisma.user.findUniqueOrThrow({
        where: { id: res.body.id },
        include: { athleteRelations: true },
      });
      expect(created.role).toBe("athlete");
      expect(created.athleteRelations).toHaveLength(0);
    });

    it("sin aceptar los términos da 400", async () => {
      expect((await app.http("post", "/auth/register").send(body({ accessCode: PILOT_CODE, acceptPolicy: false }))).status).toBe(400);
    });
  });

  describe("rol recién elegido (entrada con Google)", () => {
    it("el token emitido sin rol no sirve como coach hasta renovarlo; el renovado sí", async () => {
      await app.prisma.user.create({
        data: { email: "sin.rol@e2e.test", name: "Sin rol", role: null, passwordHash: await passwordHash(), emailVerifiedAt: new Date() },
      });
      const tokens = (await login(app, "sin.rol@e2e.test")).body;

      const done = await app.http("post", "/auth/complete-profile", tokens.accessToken).send({ role: "coach", acceptPolicy: true });
      expect(done.status).toBe(200);

      // El rol viaja dentro del token: el viejo sigue sin rol aunque la base ya lo tenga.
      expect((await app.http("get", "/routines", tokens.accessToken)).status).toBe(403);

      const renewed = await app.http("post", "/auth/refresh").send({ refreshToken: tokens.refreshToken });
      expect(renewed.status).toBeLessThan(300);
      expect((await app.http("get", "/routines", renewed.body.accessToken)).status).toBe(200);
    });
  });

  describe("resumen diario de actividad (/internal/activity)", () => {
    it("sin el secreto o con uno incorrecto da 401", async () => {
      expect((await app.http("post", "/internal/activity/daily-summary")).status).toBe(401);
      expect((await app.http("post", "/internal/activity/daily-summary", "secreto-incorrecto")).status).toBe(401);
      // Un access token de usuario tampoco sirve como secreto.
      expect((await app.http("post", "/internal/activity/daily-summary", c.token.coachA)).status).toBe(401);
    });

    it("el secreto correcto pasa la puerta (sin Slack configurado no envía nada)", async () => {
      const res = await app.http("post", "/internal/activity/daily-summary?day=2026-01-01", CRON_SECRET);
      expect(res.status).toBe(200);
    });
  });
});
