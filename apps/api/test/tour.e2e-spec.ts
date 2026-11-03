import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Guía de primer uso (CYC-191/192): un solo estado por cuenta, compartido por
// web y móvil, y la plataforma de teléfono que el atleta eligió al registrarse.

describe("Guía de primer uso", () => {
  let app: TestApp;
  let c: Scenario;
  const me = async (token: string) => (await app.http("get", "/users/me", token)).body;
  const setTour = (token: string, body: Record<string, unknown>) => app.http("patch", "/users/me/tour", token).send(body);

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("toda cuenta empieza en «pending» y /users/me lo informa", async () => {
    expect((await me(c.token.coachA)).tourStatus).toBe("pending");
    expect((await me(c.token.athleteA)).tourStatus).toBe("pending");
  });

  it("saltar, terminar o volver a abrir la guía se guarda en la cuenta", async () => {
    expect((await setTour(c.token.coachA, { status: "skipped" })).status).toBe(204);
    expect((await me(c.token.coachA)).tourStatus).toBe("skipped");
    expect((await setTour(c.token.coachA, { status: "completed" })).status).toBe(204);
    expect((await me(c.token.coachA)).tourStatus).toBe("completed");
    expect((await setTour(c.token.coachA, { status: "pending" })).status).toBe(204);
    expect((await me(c.token.coachA)).tourStatus).toBe("pending");
  });

  it("cada cuenta guarda el suyo: lo de una no cambia lo de otra", async () => {
    await setTour(c.token.athleteA, { status: "completed" });
    expect((await me(c.token.athleteA)).tourStatus).toBe("completed");
    expect((await me(c.token.athleteB)).tourStatus).toBe("pending");
    expect((await me(c.token.coachB)).tourStatus).toBe("pending");
  });

  it.each([
    ["con un valor que no existe", { status: "hecho" }],
    ["sin valor", {}],
  ])("%s da 400", async (_caso, body) => {
    const res = await setTour(c.token.coachA, body);
    expect(res.status).toBe(400);
  });

  it("sin sesión da 401", async () => {
    expect((await app.http("patch", "/users/me/tour").send({ status: "skipped" })).status).toBe(401);
  });

  it("/users/me devuelve la plataforma de teléfono elegida, o null", async () => {
    expect((await me(c.token.athleteB)).phonePlatform ?? null).toBeNull();
    await app.prisma.user.update({ where: { id: c.userId.athleteB }, data: { phonePlatform: "ios" } });
    expect((await me(c.token.athleteB)).phonePlatform).toBe("ios");
  });

  it("la exportación de datos incluye el estado de la guía", async () => {
    const res = await app.http("get", "/users/me/export", c.token.athleteA);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain("completed");
  });
});
