import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Crear un ejercicio propio (CYC-196): lo válido se guarda y lo incompleto se
// rechaza con el mensaje que la web muestra junto al campo.

describe("Crear ejercicio", () => {
  let app: TestApp;
  let c: Scenario;
  const create = (token: string, body: Record<string, unknown>) => app.http("post", "/exercises", token).send(body);

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("con nombre, grupo e implementos se guarda a nombre del coach", async () => {
    const res = await create(c.token.coachA, { name: "Remo con barra", muscleGroup: "back", equipment: ["barbell", "bench"] });
    expect(res.status).toBe(201);
    expect(res.body.equipment).toEqual(expect.arrayContaining(["barbell", "bench"]));
    expect((await app.http("get", "/exercises", c.token.coachA)).body.map((e: { id: string }) => e.id)).toContain(res.body.id);
    // Otro coach no lo ve.
    expect((await app.http("get", "/exercises", c.token.coachB)).body.map((e: { id: string }) => e.id)).not.toContain(res.body.id);
  });

  it.each([
    ["sin implementos", { name: "X", muscleGroup: "back", equipment: [] }, "Elige los implementos o marca «Peso corporal»."],
    ["sin grupo muscular", { name: "X", equipment: ["barbell"] }, "Elige un grupo muscular."],
    ["sin nombre", { name: "", muscleGroup: "back", equipment: ["barbell"] }, "Escribe el nombre del ejercicio."],
    ["con un enlace sin https", { name: "X", muscleGroup: "back", equipment: ["barbell"], videoUrl: "http://x.com" }, "Pega un enlace que empiece con https://"],
  ])("%s da 400 con el mensaje de la web", async (_caso, body, message) => {
    const res = await create(c.token.coachA, body);
    expect(res.status).toBe(400);
    expect([res.body.message].flat()).toContain(message);
  });

  describe("grupos secundarios (CYC-196 B)", () => {
    it("se guardan junto al principal; sin ellos queda vacío", async () => {
      const con = await create(c.token.coachA, { name: "Sentadilla frontal", muscleGroup: "legs", secondaryMuscleGroups: ["glutes", "core"], equipment: ["barbell"] });
      expect(con.status).toBe(201);
      expect(con.body.muscleGroup).toBe("legs");
      expect(con.body.secondaryMuscleGroups).toEqual(["glutes", "core"]);
      const sin = await create(c.token.coachA, { name: "Curl concentrado", muscleGroup: "arms", equipment: ["dumbbells"] });
      expect(sin.body.secondaryMuscleGroups).toEqual([]);
    });

    it.each([
      ["repite el principal", { muscleGroup: "legs", secondaryMuscleGroups: ["legs"] }, "El grupo principal no puede repetirse como secundario."],
      ["repite un secundario", { muscleGroup: "legs", secondaryMuscleGroups: ["glutes", "glutes"] }, "Hay grupos secundarios repetidos."],
      ["usa un grupo que no existe", { muscleGroup: "legs", secondaryMuscleGroups: ["cuello"] }, "Hay un grupo secundario que no existe."],
    ])("se rechaza si %s", async (_caso, extra, message) => {
      const res = await create(c.token.coachA, { name: "Prueba secundarios", equipment: ["barbell"], ...extra });
      expect(res.status).toBe(400);
      expect([res.body.message].flat()).toContain(message);
    });

    it("al corregir, el principal nuevo no puede estar ya entre los secundarios", async () => {
      const made = await create(c.token.coachA, { name: "Peso muerto con déficit", muscleGroup: "back", secondaryMuscleGroups: ["legs"], equipment: ["barbell"] });
      const patch = (body: Record<string, unknown>) => app.http("patch", `/exercises/${made.body.id}`, c.token.coachA).send(body);
      expect((await patch({ muscleGroup: "legs" })).status).toBe(400);
      const ok = await patch({ muscleGroup: "legs", secondaryMuscleGroups: ["back"] });
      expect(ok.status).toBe(200);
      expect(ok.body.secondaryMuscleGroups).toEqual(["back"]);
    });

    it("los ejercicios del catálogo existentes siguen con su grupo y sin secundarios", async () => {
      const list = (await app.http("get", "/exercises", c.token.coachA)).body as { muscleGroup: string; secondaryMuscleGroups: string[]; createdBy: string | null }[];
      const global = list.filter((e) => !e.createdBy);
      expect(global.length).toBeGreaterThan(0);
      expect(global.every((e) => e.muscleGroup && e.secondaryMuscleGroups.length === 0)).toBe(true);
    });
  });

  it("un atleta no crea ejercicios", async () => {
    expect((await create(c.token.athleteA, { name: "X", muscleGroup: "back", equipment: ["barbell"] })).status).toBe(403);
  });
});
