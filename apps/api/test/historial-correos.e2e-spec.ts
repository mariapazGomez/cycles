import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { emailFingerprint } from "../src/email-history/email-fingerprint";
import { EmailHistoryService } from "../src/email-history/email-history.service";
import { PASSWORD, PILOT_CODE, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";

// Base de CYC-295: lo del registro al eliminar la cuenta y en «Descargar mis
// datos», y el historial de correos, apagado y encendido.

const KEY = randomBytes(32).toString("hex");

describe("Registro del coach e historial de correos (CYC-295)", () => {
  let app: TestApp;
  let enabled = false;
  const values: Record<string, () => string | undefined> = {
    EMAIL_HISTORY_ENABLED: () => (enabled ? "true" : undefined),
    EMAIL_HISTORY_HMAC_KEY: () => (enabled ? KEY : undefined),
  };

  beforeAll(async () => {
    // Variables del historial que cada prueba enciende o apaga.
    app = await startApp({
      configure: (builder) => {
        const original = ConfigService.prototype.get;
        jest.spyOn(ConfigService.prototype, "get").mockImplementation(function (this: ConfigService, ...args: unknown[]) {
          const name = args[0] as string;
          return name in values ? values[name]() : (original as (...a: unknown[]) => unknown).apply(this, args);
        });
        return builder;
      },
    });
  });
  beforeEach(async () => {
    enabled = false;
    await resetDatabase(app.prisma);
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  const mk = async (email: string, role: "coach" | "athlete", over: Record<string, unknown> = {}) =>
    app.prisma.user.create({ data: { email, name: "Persona", role, passwordHash: await passwordHash(), emailVerifiedAt: new Date(), ...over } });
  const login = async (email: string) => (await app.http("post", "/auth/login").send({ email, password: PASSWORD })).body.accessToken as string;
  const remove = async (email: string) => {
    const res = await app.http("delete", "/users/me", await login(email)).send({ confirmation: "ELIMINAR" });
    expect(res.status).toBe(204);
  };
  const entry = (email: string) => app.prisma.registeredEmail.findUnique({ where: { fingerprint: emailFingerprint(email, KEY) } });

  const signupData = async (userId: string, email: string) => {
    await app.prisma.pilotInvitation.create({
      data: { email, status: "used", requestedBy: "equipo@e2e.test", tokenHash: `hash-${userId}`, sentAt: new Date(), usedAt: new Date(), usedByUserId: userId },
    });
  };

  it("«Descargar mis datos» suma el perfil y el estado y fechas de la invitación, sin el enlace ni quién la envió", async () => {
    const coach = await mk("coach@e2e.test", "coach");
    await signupData(coach.id, coach.email);
    await app.prisma.coachProfile.create({ data: { userId: coach.id, places: ["gym"], origin: "register", otherTexts: { places: "Plaza" } } });

    const res = await app.http("get", "/users/me/export", await login(coach.email));
    expect(res.status).toBe(200);
    expect(res.body.coachProfile).toMatchObject({ places: ["gym"], otherTexts: { places: "Plaza" } });
    expect(Object.keys(res.body.pilotInvitation).sort()).toEqual(["createdAt", "expiresAt", "queuedAt", "sentAt", "status", "usedAt"]);
    expect(res.body.emailHistory).toBeNull();
    expect(JSON.stringify(res.body)).not.toMatch(/equipo@e2e\.test|tokenHash|requestedBy|fingerprint/);
  });

  it("una cuenta sin invitación ni perfil exporta los campos vacíos", async () => {
    const athlete = await mk("atleta@e2e.test", "athlete");
    const res = await app.http("get", "/users/me/export", await login(athlete.email));
    expect(res.body.pilotInvitation).toBeNull();
    expect(res.body.emailHistory).toBeNull();
  });

  it.each(["coach", "athlete"] as const)("apagado: al eliminar un %s se borran invitación y perfil y no queda huella", async (role) => {
    const user = await mk(`${role}@e2e.test`, role);
    await signupData(user.id, user.email);
    if (role === "coach") await app.prisma.coachProfile.create({ data: { userId: user.id, origin: "survey" } });

    await remove(user.email);

    expect(await app.prisma.pilotInvitation.count()).toBe(0);
    expect(await app.prisma.coachProfile.count()).toBe(0);
    expect(await app.prisma.registeredEmail.count()).toBe(0);
  });

  it("apagado: registrarse no guarda ninguna huella", async () => {
    const res = await app
      .http("post", "/auth/register")
      .send({ name: "Coach", email: "nuevo@e2e.test", password: PASSWORD, role: "coach", acceptPolicy: true, accessCode: PILOT_CODE });
    expect(res.status).toBe(201);
    expect(await app.prisma.registeredEmail.count()).toBe(0);
  });

  it.each(["coach", "athlete"] as const)("encendido: la huella de un %s sobrevive a eliminar la cuenta y un alias no es un correo nuevo", async (role) => {
    enabled = true;
    const res = await app
      .http("post", "/auth/register")
      .send({ name: "Persona", email: "ana.perez@gmail.com", password: PASSWORD, role, acceptPolicy: true, accessCode: PILOT_CODE });
    expect(res.status).toBe(201);
    const first = (await entry("ana.perez@gmail.com"))!;
    expect(first.lastAccountDeletedAt).toBeNull();
    await app.prisma.user.update({ where: { id: res.body.id }, data: { emailVerifiedAt: new Date() } });

    await remove("ana.perez@gmail.com");

    const after = (await entry("anaperez+otra@gmail.com"))!;
    expect(after.firstRegisteredAt).toEqual(first.firstRegisteredAt);
    expect(after.lastAccountDeletedAt).not.toBeNull();
    expect(await app.prisma.registeredEmail.count()).toBe(1);
    // Solo la huella y las dos fechas.
    expect(Object.keys(after).sort()).toEqual(["fingerprint", "firstRegisteredAt", "lastAccountDeletedAt"]);
    expect(JSON.stringify(after)).not.toContain("ana");
  });

  it("encendido: carga las cuentas activadas que ya existían, sin demos ni invitados pendientes, y es repetible", async () => {
    await mk("coach@e2e.test", "coach");
    await mk("atleta@e2e.test", "athlete");
    await mk("demo@e2e.test", "coach", { isDemo: true });
    await mk("pendiente@e2e.test", "athlete", { passwordHash: null, emailVerifiedAt: null });
    await mk("cuenta-eliminada-1@cycles.invalid", "coach");
    const history = app.app.get(EmailHistoryService);

    enabled = false;
    expect(await history.backfill()).toBe(0);
    enabled = true;
    expect(await history.backfill()).toBe(2);
    expect(await history.backfill()).toBe(0);
    expect(await entry("coach@e2e.test")).not.toBeNull();
    expect(await entry("atleta@e2e.test")).not.toBeNull();
    expect(await app.prisma.registeredEmail.count()).toBe(2);

    const res = await app.http("get", "/users/me/export", await login("coach@e2e.test"));
    expect(Object.keys(res.body.emailHistory).sort()).toEqual(["firstRegisteredAt", "lastAccountDeletedAt"]);
  });

  it("encendido: eliminar una cuenta de demostración no guarda huella", async () => {
    enabled = true;
    await mk("demo@e2e.test", "athlete", { isDemo: true });
    await remove("demo@e2e.test");
    expect(await app.prisma.registeredEmail.count()).toBe(0);
  });
});
