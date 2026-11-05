import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";
import { SYSTEM_CHART_IDS } from "../src/tracking/summary-layout";

// Disposición de la pizarra del Resumen (CYC-238): una por coach, solo suya.

const system = (overrides: Record<string, object> = {}) =>
  SYSTEM_CHART_IDS.map((id) => ({ id, origen: "sistema", tamano: "mitad", visible: true, ...(overrides[id] ?? {}) }));

describe("Pizarra del Resumen (GET/PUT /coach/summary-layout)", () => {
  let app: TestApp;
  let c: Scenario;
  const get = (token: string) => app.http("get", "/coach/summary-layout", token);
  const put = (token: string, charts: unknown) => app.http("put", "/coach/summary-layout", token).send({ charts });

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("un coach que no guardó nada recibe los cinco gráficos del sistema, a la vista", async () => {
    const res = await get(c.token.coachA);
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);
    expect(res.body.charts.map((x: { id: string }) => x.id)).toEqual([...SYSTEM_CHART_IDS]);
    expect(res.body.charts.every((x: { visible: boolean }) => x.visible)).toBe(true);
  });

  it("guarda el orden, el tamaño y lo oculto, y lo devuelve igual", async () => {
    const charts = [...system({ constancia: { visible: false }, "plan-real": { tamano: "completo" } })].reverse();
    expect((await put(c.token.coachA, charts)).status).toBe(200);
    const res = await get(c.token.coachA);
    expect(res.body.isDefault).toBe(false);
    expect(res.body.charts).toEqual(charts);
  });

  it("acepta un gráfico propio con medida, agrupación, forma y filtros", async () => {
    const own = { id: "carga-semanal", origen: "coach", tamano: "completo", visible: true, titulo: "Carga por semana", medida: "carga_kg", agrupar: "semana", forma: "columnas", filtros: { periodoSemanas: 8 } };
    const charts = [...system(), own];
    expect((await put(c.token.coachA, charts)).status).toBe(200);
    expect((await get(c.token.coachA)).body.charts.at(-1)).toEqual(own);
  });

  it("la disposición de un coach no la ve ni la cambia otro", async () => {
    await put(c.token.coachA, [...system({ esfuerzo: { visible: false } })]);
    const b = await get(c.token.coachB);
    expect(b.body.isDefault).toBe(true);
    expect(b.body.charts.find((x: { id: string }) => x.id === "esfuerzo").visible).toBe(true);
    await put(c.token.coachB, system({ constancia: { tamano: "completo" } }));
    const a = await get(c.token.coachA);
    expect(a.body.charts.find((x: { id: string }) => x.id === "esfuerzo").visible).toBe(false);
    expect(a.body.charts.find((x: { id: string }) => x.id === "constancia").tamano).toBe("mitad");
  });

  it("el cuerpo no puede apuntar a la disposición de otro coach (el id sale del token)", async () => {
    const res = await app.http("put", "/coach/summary-layout", c.token.coachA).send({ coachId: c.userId.coachB, charts: system() });
    expect([200, 400]).toContain(res.status);
    const b = await app.prisma.coachSummaryLayout.findUnique({ where: { coachId: c.userId.coachB } });
    expect(b?.charts).toEqual(system({ constancia: { tamano: "completo" } }));
  });

  it("el atleta no puede leer ni escribir", async () => {
    expect((await get(c.token.athleteA)).status).toBe(403);
    expect((await put(c.token.athleteA, system())).status).toBe(403);
  });

  it.each([
    ["no es una lista", { x: 1 }],
    ["falta un gráfico del sistema", system().slice(1)],
    ["id repetido", [...system(), ...system().slice(0, 1)]],
    ["tamaño que no existe", system({ constancia: { tamano: "enorme" } })],
    ["visible que no es verdadero o falso", system({ constancia: { visible: "si" } })],
    ["campo de más en uno del sistema", system({ constancia: { titulo: "Otro" } })],
    ["gráfico propio con id de uno del sistema", [...system().slice(1), { id: "constancia", origen: "coach", tamano: "mitad", visible: true, titulo: "x", medida: "carga_kg", agrupar: "semana", forma: "linea" }]],
    ["gráfico propio sin medida", [...system(), { id: "mio", origen: "coach", tamano: "mitad", visible: true, titulo: "x", agrupar: "semana", forma: "linea" }]],
    ["gráfico propio con medida inventada", [...system(), { id: "mio", origen: "coach", tamano: "mitad", visible: true, titulo: "x", medida: "secreto", agrupar: "semana", forma: "linea" }]],
    ["filtro con campo que no existe", [...system(), { id: "mio", origen: "coach", tamano: "mitad", visible: true, titulo: "x", medida: "carga_kg", agrupar: "semana", forma: "linea", filtros: { atletaId: "otro" } }]],
    ["título larguísimo", [...system(), { id: "mio", origen: "coach", tamano: "mitad", visible: true, titulo: "x".repeat(81), medida: "carga_kg", agrupar: "semana", forma: "linea" }]],
    ["demasiados gráficos", [...system(), ...Array.from({ length: 30 }, (_, i) => ({ id: `g${i}`, origen: "coach", tamano: "mitad", visible: true, titulo: "x", medida: "carga_kg", agrupar: "semana", forma: "linea" }))]],
  ])("rechaza con 400: %s", async (_caso, charts) => {
    expect((await put(c.token.coachA, charts)).status).toBe(400);
  });

  it("una entrada rechazada no cambia lo ya guardado", async () => {
    const before = (await get(c.token.coachA)).body;
    await put(c.token.coachA, [{ id: "x" }]);
    expect((await get(c.token.coachA)).body).toEqual(before);
  });

  it("eliminar la cuenta del coach borra su disposición", async () => {
    expect(await app.prisma.coachSummaryLayout.count({ where: { coachId: c.userId.coachA } })).toBe(1);
    const res = await app.http("delete", "/users/me", c.token.coachA).send({ confirmation: "ELIMINAR" });
    expect([200, 204]).toContain(res.status);
    expect(await app.prisma.coachSummaryLayout.count({ where: { coachId: c.userId.coachA } })).toBe(0);
  });
});
