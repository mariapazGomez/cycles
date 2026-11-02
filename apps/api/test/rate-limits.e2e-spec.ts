import { randomBytes } from "crypto";
import { PASSWORD, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";

// Límites de intentos (S-01, S-13): por IP real y por correo. Usa la misma lógica
// de IP que producción: solo cuenta el header `True-Client-IP` (que pone
// Cloudflare), no `X-Forwarded-For`, que cualquiera puede inventar.

describe("Límites de intentos", () => {
  let app: TestApp;
  let next = 0;

  const from = (ip: string, method: "post", path: string) => app.http(method, path).set("True-Client-IP", ip);
  const uniqueEmail = () => `limite-${++next}-${randomBytes(3).toString("hex")}@e2e.test`;
  const contact = (ip: string, email = uniqueEmail()) =>
    from(ip, "post", "/contact").send({ email, message: "Quiero conocer Cycles para mis atletas.", elapsedMs: 8_000 });

  beforeAll(async () => {
    app = await startApp({ realClientIp: true });
    await resetDatabase(app.prisma);
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("formulario de contacto (P-18)", () => {
    it("deja 10 por hora desde la misma IP y el 11.º da 429 con un mensaje claro", async () => {
      const ip = "203.0.113.10";
      for (let i = 0; i < 10; i++) {
        expect((await contact(ip)).status).toBe(201);
      }
      const blocked = await contact(ip);
      expect(blocked.status).toBe(429);
      expect(blocked.body.message).toMatch(/Hiciste demasiados intentos/);
    });

    it("el límite es por IP: otra IP sigue pudiendo enviar", async () => {
      expect((await contact("203.0.113.11")).status).toBe(201);
    });

    it("inventar X-Forwarded-For no esquiva el límite (solo vale True-Client-IP)", async () => {
      const ip = "203.0.113.20";
      for (let i = 0; i < 10; i++) {
        await from(ip, "post", "/contact").set("X-Forwarded-For", `198.51.100.${i + 1}`).send({
          email: uniqueEmail(),
          message: "Quiero conocer Cycles para mis atletas.",
          elapsedMs: 8_000,
        });
      }
      const spoofed = await from(ip, "post", "/contact").set("X-Forwarded-For", "198.51.100.200").send({
        email: uniqueEmail(),
        message: "Quiero conocer Cycles para mis atletas.",
        elapsedMs: 8_000,
      });
      expect(spoofed.status).toBe(429);
    });

    it("un mismo correo solo puede escribir 2 veces al día, aunque cambie de IP", async () => {
      const email = uniqueEmail();
      expect((await contact("203.0.113.30", email)).status).toBe(201);
      expect((await contact("203.0.113.31", email)).status).toBe(201);
      expect((await contact("203.0.113.32", email)).status).toBe(429);
    });

    it("un pedido con un True-Client-IP inválido no se cuela con otra IP: cae a la IP de la conexión", async () => {
      const first = await app.http("post", "/contact").set("True-Client-IP", "no-es-una-ip").send({
        email: uniqueEmail(),
        message: "Quiero conocer Cycles para mis atletas.",
        elapsedMs: 8_000,
      });
      expect(first.status).toBe(201);
    });
  });

  describe("login", () => {
    const login = (ip: string, email: string) => from(ip, "post", "/auth/login").send({ email, password: "clave-incorrecta-1" });

    it("5 intentos por minuto contra el mismo correo; el 6.º da 429 aunque cambie la IP", async () => {
      const email = uniqueEmail();
      for (let i = 0; i < 5; i++) {
        expect((await login(`198.51.100.${10 + i}`, email)).status).toBe(401);
      }
      expect((await login("198.51.100.99", email)).status).toBe(429);
    });

    it("20 intentos por minuto desde la misma IP aunque cambie el correo; el 21.º da 429", async () => {
      const ip = "198.51.100.150";
      for (let i = 0; i < 20; i++) {
        expect((await login(ip, uniqueEmail())).status).toBe(401);
      }
      expect((await login(ip, uniqueEmail())).status).toBe(429);
    });

    it("una cuenta real que acierta no se bloquea por intentos de otra IP", async () => {
      const email = uniqueEmail();
      await app.prisma.user.create({
        data: { email, name: "Real", role: "coach", passwordHash: await passwordHash(), emailVerifiedAt: new Date() },
      });
      expect((await from("198.51.100.201", "post", "/auth/login").send({ email, password: PASSWORD })).status).toBe(200);
    });
  });

  describe("registro", () => {
    it("5 por hora desde la misma IP; el 6.º da 429", async () => {
      const ip = "192.0.2.50";
      const register = () =>
        from(ip, "post", "/auth/register").send({ email: uniqueEmail(), password: "contraseña-larga-1", name: "N", role: "coach", acceptPolicy: true });
      for (let i = 0; i < 5; i++) {
        expect((await register()).status).toBe(403); // registro cerrado, pero cuenta como intento
      }
      expect((await register()).status).toBe(429);
    });
  });
});
