import { exportJWK, generateKeyPair, createLocalJWKSet, SignJWT, type JWK, type JWTVerifyGetKey, type KeyLike } from "jose";
import { ConfigService } from "@nestjs/config";
import { AccessTokenVerifier } from "../src/admin/access-token.verifier";
import { hashToken } from "../src/auth/token.util";
import { InvitationsService } from "../src/invitations/invitations.service";
import { INVITATION_REPLY_TO, MailDeliveryError, MailService } from "../src/mail/mail.service";
import { PASSWORD, PILOT_CODE, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";

// Invitaciones del piloto (CYC-295). El correo está simulado: nunca sale nada.

const TEAM = "equipo-e2e.cloudflareaccess.com";
const AUD = "aud-e2e-0123456789abcdef";
const SECRET = "secreto-cola-e2e-0123456789abcdef-0123456789abcdef-0123456789abcdef";
const DAY = 86_400_000;

let jwks: JWTVerifyGetKey;
class TestVerifier extends AccessTokenVerifier {
  protected resolveKeys(): JWTVerifyGetKey {
    return jwks;
  }
}

describe("Invitaciones del piloto", () => {
  let app: TestApp;
  let adminToken = "";
  let service: InvitationsService;
  let send: jest.SpyInstance;
  const sent: { email: string; token: string }[] = [];
  let enabled = true;

  const admin = (method: "get" | "post" | "delete", path: string) => app.http(method, path).set("Cf-Access-Jwt-Assertion", adminToken);
  const wrote = (email: string, message = "Entreno a un equipo de vóleibol.", createdAt = new Date()) => app.prisma.contactRequest.create({ data: { email, message, createdAt } });
  const invite = (email: string) => admin("post", "/admin/invitations").send({ email });
  const rowOf = (email: string) => app.prisma.pilotInvitation.findUnique({ where: { email } });
  const tokenFor = (email: string) => [...sent].reverse().find((s) => s.email === email)!.token;
  // Mañana a las 12:00 de Chile: dentro del horario y con el cupo de otro día.
  const tomorrowNoon = (days = 1) => {
    const d = new Date(Date.now() + days * DAY);
    d.setUTCHours(15, 0, 0, 0);
    return d;
  };
  const register = (email: string, invitationToken: string | undefined, over: Record<string, unknown> = {}) =>
    app.http("post", "/auth/register").send({ name: "Persona Invitada", email, password: PASSWORD, role: "coach", acceptPolicy: true, invitationToken, ...over });

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
    jwks = createLocalJWKSet({ keys: [jwk] });
    adminToken = await new SignJWT({ email: "equipo@e2e.test" })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(`https://${TEAM}`)
      .setAudience(AUD)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(pair.privateKey as KeyLike);
    process.env.CF_ACCESS_TEAM_DOMAIN = TEAM;
    process.env.CF_ACCESS_AUD = AUD;
    process.env.INVITATIONS_CRON_SECRET = SECRET;

    const original = ConfigService.prototype.get;
    jest.spyOn(ConfigService.prototype, "get").mockImplementation(function (this: ConfigService, ...args: unknown[]) {
      if (args[0] === "INVITATIONS_ENABLED") return enabled ? "true" : undefined;
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    });
    app = await startApp({
      configure: (builder) => builder.overrideProvider(AccessTokenVerifier).useFactory({ factory: (config: ConfigService) => new TestVerifier(config), inject: [ConfigService] }),
    });
    service = app.app.get(InvitationsService);
    send = jest.spyOn(app.app.get(MailService), "sendPilotInvitationEmail");
  });
  beforeEach(async () => {
    enabled = true;
    sent.length = 0;
    send.mockReset().mockImplementation(async (email: string, token: string) => {
      sent.push({ email, token });
    });
    await resetDatabase(app.prisma);
  });
  afterAll(async () => {
    delete process.env.CF_ACCESS_TEAM_DOMAIN;
    delete process.env.CF_ACCESS_AUD;
    delete process.env.INVITATIONS_CRON_SECRET;
    jest.restoreAllMocks();
    await app.close();
  });

  it("las rutas de admin exigen Cloudflare Access", async () => {
    expect((await app.http("get", "/admin/invitations")).status).toBe(401);
    expect((await app.http("post", "/admin/invitations").send({ email: "a@x.cl" })).status).toBe(401);
    expect((await app.http("delete", "/admin/invitations/x/queue")).status).toBe(401);
  });

  it("apagado: se ve la lista, no se puede enviar y la cola no manda nada", async () => {
    enabled = false;
    await wrote("ana@e2e.test");
    const list = await admin("get", "/admin/invitations");
    expect(list.body).toMatchObject({ enabled: false, sentToday: 0, dailyCap: 15 });
    expect(list.body.items[0]).toMatchObject({ email: "ana@e2e.test", state: "not_invited", messages: 1, beforeNewNotice: true });

    const res = await invite("ana@e2e.test");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("El envío de invitaciones todavía no está activado.");
    await app.prisma.pilotInvitation.create({ data: { email: "beto@e2e.test", status: "queued", requestedBy: "equipo@e2e.test", queuedAt: new Date() } });
    await service.runQueue(tomorrowNoon());
    expect(send).not.toHaveBeenCalled();
  });

  it("el formulario de contacto no crea ni envía invitaciones", async () => {
    const res = await app.http("post", "/contact").send({ email: "ana@e2e.test", message: "Quiero probar Cycles con mi equipo.", website: "", elapsedMs: 9000 });
    expect(res.status).toBe(201);
    expect(await app.prisma.pilotInvitation.count()).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("el clic envía una vez, guarda solo el hash y lo anota sin el correo", async () => {
    await wrote("ana@e2e.test", "Primer mensaje largo.", new Date(Date.now() - 2 * DAY));
    await wrote("ana@e2e.test", "Segundo mensaje largo.");
    const res = await invite("  ANA@e2e.test ");
    expect(res.body).toMatchObject({ state: "sent" });
    const row = (await rowOf("ana@e2e.test"))!;
    expect(row).toMatchObject({ status: "sent", requestedBy: "equipo@e2e.test" });
    expect(row.tokenHash).toBe(hashToken(tokenFor("ana@e2e.test")));
    expect(JSON.stringify(row)).not.toContain(tokenFor("ana@e2e.test"));
    expect(row.expiresAt!.getTime() - row.sentAt!.getTime()).toBe(7 * DAY);

    const again = await invite("ana@e2e.test");
    expect(again.status).toBe(409);
    expect(send).toHaveBeenCalledTimes(1);

    const list = (await admin("get", "/admin/invitations")).body;
    expect(list.sentToday).toBe(1);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ messages: 2, lastMessage: "Segundo mensaje largo.", state: "sent" });
    expect(JSON.stringify(list)).not.toMatch(/tokenHash|requestedBy/);
    const logs = await app.prisma.adminAccessLog.findMany();
    expect(logs.map((l) => l.view).sort()).toEqual(["invitation-send", "invitations"]);
    expect(JSON.stringify(logs)).not.toContain("ana@e2e.test");
  });

  it("no invita a quien ya tiene cuenta ni a un correo que no escribió", async () => {
    await wrote("coach@e2e.test");
    await app.prisma.user.create({ data: { email: "coach@e2e.test", name: "C", role: "coach", passwordHash: await passwordHash() } });
    expect((await invite("coach@e2e.test")).status).toBe(409);
    expect((await invite("nadie@e2e.test")).status).toBe(404);
    expect(send).not.toHaveBeenCalled();
    expect((await admin("get", "/admin/invitations")).body.items[0].state).toBe("has_account");
  });

  it("veinte clics a la vez mandan 15 y dejan 5 en cola", async () => {
    const emails = Array.from({ length: 20 }, (_, i) => `p${i}@e2e.test`);
    for (const email of emails) await wrote(email);
    const results = await Promise.all(emails.map((email) => service.request(email, "equipo@e2e.test")));
    expect(results.filter((r) => r.state === "sent")).toHaveLength(15);
    expect(results.filter((r) => r.state === "queued")).toHaveLength(5);
    expect(send).toHaveBeenCalledTimes(15);
    const list = (await admin("get", "/admin/invitations")).body;
    expect(list.sentToday).toBe(15);
    for (const item of list.items.filter((i: { state: string }) => i.state === "queued")) expect(item.queuedFor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dos clics a la vez en el mismo correo mandan uno solo", async () => {
    await wrote("ana@e2e.test");
    const results = await Promise.allSettled([service.request("ana@e2e.test", "a@e2e.test"), service.request("ana@e2e.test", "b@e2e.test")]);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await app.prisma.pilotInvitation.count()).toBe(1);
  });

  const queued = (email: string, minutesAgo: number) =>
    app.prisma.pilotInvitation.create({ data: { email, status: "queued", requestedBy: "equipo@e2e.test", queuedAt: new Date(Date.now() - minutesAgo * 60_000) } });

  it("la cola respeta el horario y el orden, y dos pasadas a la vez no duplican", async () => {
    await queued("segunda@e2e.test", 5);
    await queued("primera@e2e.test", 10);
    const night = tomorrowNoon();
    night.setUTCHours(11, 0, 0, 0); // 08:00 de Chile
    expect(await service.runQueue(night)).toMatchObject({ sent: 0 });
    expect(send).not.toHaveBeenCalled();

    await Promise.all([service.runQueue(tomorrowNoon()), service.runQueue(tomorrowNoon())]);
    expect(sent.map((s) => s.email).sort()).toEqual(["primera@e2e.test", "segunda@e2e.test"]);
    expect(await app.prisma.pilotInvitation.count({ where: { status: "sent" } })).toBe(2);
  });

  it("la cola no pasa de 15 por día y sigue al siguiente", async () => {
    for (let i = 0; i < 17; i += 1) await queued(`q${String(i).padStart(2, "0")}@e2e.test`, 100 - i);
    expect(await service.runQueue(tomorrowNoon())).toMatchObject({ sent: 15 });
    expect(await service.runQueue(tomorrowNoon())).toMatchObject({ sent: 0 });
    expect(await service.runQueue(tomorrowNoon(2))).toMatchObject({ sent: 2 });
    expect(sent.at(-1)!.email).toBe("q16@e2e.test");
  }, 60_000);

  it("con algo en cola, un clic nuevo no se adelanta", async () => {
    for (let i = 0; i < 15; i += 1) await queued(`q${i}@e2e.test`, 100 - i);
    await wrote("nueva@e2e.test");
    expect((await invite("nueva@e2e.test")).body.state).toBe("queued");
    expect(send).not.toHaveBeenCalled();
  });

  it("a quien creó su cuenta mientras esperaba no se le escribe", async () => {
    await queued("ya@e2e.test", 5);
    await app.prisma.user.create({ data: { email: "ya@e2e.test", name: "Y", role: "coach" } });
    await service.runQueue(tomorrowNoon());
    expect(send).not.toHaveBeenCalled();
    expect(await app.prisma.pilotInvitation.count()).toBe(0);
  });

  it("un error de envío no descuenta cupo, no se reintenta solo y «Reintentar» funciona", async () => {
    await wrote("ana@e2e.test");
    send.mockRejectedValueOnce(new MailDeliveryError("sin red"));
    expect((await invite("ana@e2e.test")).body.state).toBe("failed");
    expect(await rowOf("ana@e2e.test")).toMatchObject({ status: "failed", tokenHash: null, sentAt: null });
    expect((await admin("get", "/admin/invitations")).body.sentToday).toBe(0);
    await service.runQueue(tomorrowNoon());
    expect(send).toHaveBeenCalledTimes(1);
    expect((await invite("ana@e2e.test")).body.state).toBe("sent");
    expect(await app.prisma.pilotInvitation.count()).toBe(1);
  });

  it("un envío cortado pasa a error a los 10 minutos", async () => {
    await app.prisma.pilotInvitation.create({ data: { email: "cortada@e2e.test", status: "sending", requestedBy: "x", attemptedAt: new Date(Date.now() - 11 * 60_000), tokenHash: "h" } });
    await service.runQueue();
    expect(await rowOf("cortada@e2e.test")).toMatchObject({ status: "failed", tokenHash: null });
    expect(send).not.toHaveBeenCalled();
  });

  it("quitar de la cola: la nueva desaparece y la vencida vuelve a vencida", async () => {
    const fresh = await queued("nueva@e2e.test", 1);
    const old = new Date(Date.now() - 10 * DAY);
    const expired = await app.prisma.pilotInvitation.create({
      data: { email: "vieja@e2e.test", status: "queued", requestedBy: "x", queuedAt: new Date(), sentAt: old, expiresAt: new Date(old.getTime() + 7 * DAY) },
    });
    expect((await admin("delete", `/admin/invitations/${fresh.id}/queue`)).status).toBe(204);
    expect((await admin("delete", `/admin/invitations/${expired.id}/queue`)).status).toBe(204);
    expect(await rowOf("nueva@e2e.test")).toBeNull();
    expect((await admin("get", "/admin/invitations")).body.items[0]).toMatchObject({ email: "vieja@e2e.test", state: "expired" });
    expect((await admin("delete", `/admin/invitations/${expired.id}/queue`)).status).toBe(404);
  });

  it("«Enviar de nuevo» renueva la misma invitación y el enlace anterior deja de servir", async () => {
    await wrote("ana@e2e.test");
    await invite("ana@e2e.test");
    const first = tokenFor("ana@e2e.test");
    const original = (await rowOf("ana@e2e.test"))!;
    await app.prisma.pilotInvitation.update({ where: { id: original.id }, data: { sentAt: new Date(Date.now() - 9 * DAY), expiresAt: new Date(Date.now() - 2 * DAY) } });
    expect((await invite("ana@e2e.test")).body.state).toBe("sent");
    const renewed = (await rowOf("ana@e2e.test"))!;
    expect(renewed.id).toBe(original.id);
    expect(renewed.createdAt).toEqual(original.createdAt);
    expect((await app.http("post", "/auth/invitation/check").send({ token: first })).status).toBe(410);
    expect((await app.http("post", "/auth/invitation/check").send({ token: tokenFor("ana@e2e.test") })).body).toEqual({ email: "ana@e2e.test" });
  });

  it("se borra a los 12 meses, también apagado", async () => {
    await app.prisma.pilotInvitation.create({ data: { email: "antigua@e2e.test", status: "sent", requestedBy: "x", createdAt: new Date(Date.now() - 400 * DAY) } });
    await queued("reciente@e2e.test", 1);
    enabled = false;
    expect(await service.runQueue()).toMatchObject({ purged: 1, sent: 0 });
    expect(await app.prisma.pilotInvitation.count()).toBe(1);
  });

  it("con la invitación se crea la cuenta con el registro cerrado, verificada y con la sesión iniciada", async () => {
    await wrote("ana@e2e.test");
    await invite("ana@e2e.test");
    const token = tokenFor("ana@e2e.test");

    const res = await register("ana@e2e.test", token);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect((await app.http("get", "/users/me", res.body.accessToken)).body).toMatchObject({ email: "ana@e2e.test", role: "coach", emailVerified: true });
    expect(await app.prisma.emailVerificationToken.count()).toBe(0);
    expect(await rowOf("ana@e2e.test")).toMatchObject({ status: "used", usedByUserId: res.body.id, tokenHash: null });

    const reuse = await register("ana@e2e.test", token);
    expect(reuse.status).toBe(410);
    expect(reuse.body.message).toBe("Esta invitación ya no sirve.");
    expect((await admin("get", "/admin/invitations")).body.items[0].state).toBe("registered");
  });

  it("desde la web la sesión va en cookie, sin el token de renovación en el cuerpo", async () => {
    await wrote("web@e2e.test");
    await invite("web@e2e.test");
    const res = await register("web@e2e.test", tokenFor("web@e2e.test"), { role: "athlete" }).set("Origin", "http://localhost:5173").set("X-Cycles-Client", "web");
    expect(res.status).toBe(201);
    expect(res.body.refreshToken).toBeUndefined();
    expect(String(res.headers["set-cookie"])).toMatch(/HttpOnly/i);
  });

  it("el enlace no sirve para otro correo, vencido ni inventado, con el mismo error", async () => {
    await wrote("ana@e2e.test");
    await invite("ana@e2e.test");
    const token = tokenFor("ana@e2e.test");
    for (const res of [await register("otra@e2e.test", token), await register("ana@e2e.test", "inventado")]) {
      expect(res.status).toBe(410);
      expect(res.body.message).toBe("Esta invitación ya no sirve.");
    }
    await app.prisma.pilotInvitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await register("ana@e2e.test", token)).status).toBe(410);
    expect(await app.prisma.user.count()).toBe(0);
  });

  it("dos registros a la vez con el mismo enlace crean una sola cuenta", async () => {
    await wrote("ana@e2e.test");
    await invite("ana@e2e.test");
    const token = tokenFor("ana@e2e.test");
    const statuses = (await Promise.all([register("ana@e2e.test", token), register("ana@e2e.test", token)])).map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(await app.prisma.user.count()).toBe(1);
  });

  it("sin invitación nada cambia: cerrado se rechaza y el código del piloto sigue sirviendo", async () => {
    expect((await register("sin@e2e.test", undefined)).status).toBe(403);
    const res = await register("codigo@e2e.test", undefined, { accessCode: PILOT_CODE });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeUndefined();
  });

  it("el disparador externo exige su secreto y solo responde cantidades", async () => {
    expect((await app.http("post", "/internal/invitations/run-queue")).status).toBe(401);
    expect((await app.http("post", "/internal/invitations/run-queue", "otro")).status).toBe(401);
    const res = await app.http("post", "/internal/invitations/run-queue", SECRET);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["failed", "purged", "sent"]);
  });

  it("la carta sale con respuesta a hola@getcycles.app", () => {
    expect(INVITATION_REPLY_TO).toBe("hola@getcycles.app");
  });
});
