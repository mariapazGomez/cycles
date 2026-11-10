import { randomUUID } from "crypto";
import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario, type Who } from "./support/seed";

// Matriz de autorización (CYC-90, S-11 · R4 y R5). Para cada endpoint protegido:
//   - sin sesión → 401
//   - rol equivocado → 403
//   - coach que no es dueño del dato → 403 o 404 (nunca datos)
//   - coach con la relación terminada → 403
//   - atleta sobre datos de otro atleta → 403 o 404
// Los casos negativos no modifican nada; las pruebas «positivas» confirman que el
// arnés funciona y que cada persona ve solo lo suyo.

type Method = "get" | "post" | "put" | "patch" | "delete";
type Actor = Who | "none";
const DENIED = [403, 404]; // no revela si existe: ambos protegen el dato

interface Row {
  method: Method;
  path: (c: Scenario) => string;
  body?: (c: Scenario) => object;
  cases: Array<[Actor, number | number[], string]>;
}

const iso = new Date(Date.UTC(2030, 0, 7)).toISOString();

const noSession = (): [Actor, number, string] => ["none", 401, "sin sesión"];
const wrongRoleCoachOnly = (): [Actor, number, string] => ["athleteA", 403, "atleta en ruta de coach"];
const wrongRoleAthleteOnly = (): [Actor, number, string] => ["coachA", 403, "coach en ruta de atleta"];
const notOwnerCoach = (): [Actor, number[], string] => ["coachB", DENIED, "coach que no es dueño"];

// Ruta de coach sobre un recurso del ciclo A (de coachA) y del ciclo C (relación terminada).
function coachResource(method: Method, onA: (c: Scenario) => string, onC: (c: Scenario) => string, body?: (c: Scenario) => object): Row[] {
  return [
    { method, path: onA, body, cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
    { method, path: onC, body, cases: [["coachA", 403, "relación con el atleta terminada"]] },
  ];
}

const rows: Row[] = [
  // Atletas
  { method: "post", path: () => "/athletes/invite", body: () => ({ email: "nuevo@e2e.test", name: "Nuevo" }), cases: [noSession(), wrongRoleCoachOnly()] },
  { method: "get", path: () => "/athletes", cases: [noSession(), wrongRoleCoachOnly()] },

  // Ciclos y plantillas
  {
    method: "post",
    path: () => "/cycles",
    body: (c) => ({ athleteId: c.userId.athleteB, name: "X", startDate: iso, endDate: iso, cycleType: "mesocycle", sessionsPerWeek: 3 }),
    cases: [noSession(), wrongRoleCoachOnly(), ["coachA", 403, "crear para el atleta de otro coach"]],
  },
  {
    method: "post",
    path: () => "/cycles",
    body: (c) => ({ athleteId: c.userId.athleteC, name: "X", startDate: iso, endDate: iso, cycleType: "mesocycle", sessionsPerWeek: 3 }),
    cases: [["coachA", 403, "crear para un atleta con relación terminada"]],
  },
  { method: "post", path: () => "/cycles/templates", body: () => ({ name: "T", cycleType: "mesocycle", weeks: 4, sessionsPerWeek: 3 }), cases: [noSession(), wrongRoleCoachOnly()] },
  { method: "patch", path: (c) => `/cycles/templates/${c.templateA}`, body: () => ({ name: "Y" }), cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
  {
    method: "post",
    path: (c) => `/cycles/${c.templateA}/assign`,
    body: (c) => ({ athleteId: c.userId.athleteA, startDate: iso }),
    cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()],
  },
  {
    method: "post",
    path: (c) => `/cycles/${c.templateA}/assign`,
    body: (c) => ({ athleteId: c.userId.athleteB, startDate: iso }),
    cases: [["coachA", 403, "asignar a un atleta de otro coach"]],
  },
  {
    method: "post",
    path: (c) => `/cycles/${c.templateA}/assign`,
    body: (c) => ({ athleteId: c.userId.athleteC, startDate: iso }),
    cases: [["coachA", 403, "asignar a un atleta con relación terminada"]],
  },
  {
    method: "get",
    path: (c) => `/cycles/${c.cycleA}`,
    cases: [noSession(), notOwnerCoach(), ["athleteB", DENIED, "atleta ajeno"], ["athleteC", DENIED, "otro atleta"]],
  },
  { method: "get", path: (c) => `/cycles/${c.cycleC}`, cases: [["coachA", 403, "relación terminada"]] },
  { method: "get", path: (c) => `/cycles/${c.cycleA}/children`, cases: [noSession(), notOwnerCoach(), ["athleteB", DENIED, "atleta ajeno"]] },
  { method: "get", path: (c) => `/cycles/${c.cycleC}/children`, cases: [["coachA", 403, "relación terminada"]] },
  ...coachResource("patch", (c) => `/cycles/${c.cycleA}`, (c) => `/cycles/${c.cycleC}`, () => ({ name: "Z" })),

  // Sesiones
  ...coachResource("post", (c) => `/cycles/${c.cycleA}/sessions`, (c) => `/cycles/${c.cycleC}/sessions`, (c) => ({ routineId: c.routineA, weekNumber: 2, slotNumber: 1 })),
  { method: "get", path: (c) => `/cycles/${c.cycleA}/sessions`, cases: [noSession(), notOwnerCoach(), ["athleteB", DENIED, "atleta ajeno"]] },
  { method: "get", path: (c) => `/cycles/${c.cycleC}/sessions`, cases: [["coachA", 403, "relación terminada"]] },
  { method: "get", path: (c) => `/sessions/${c.sA}`, cases: [noSession(), notOwnerCoach(), ["athleteB", DENIED, "atleta ajeno"]] },
  { method: "get", path: (c) => `/sessions/${c.sC}`, cases: [["coachA", 403, "relación terminada"]] },
  ...coachResource("patch", (c) => `/sessions/${c.sA}`, (c) => `/sessions/${c.sC}`, () => ({ name: "Nuevo nombre" })),
  ...coachResource("delete", (c) => `/sessions/${c.sA}`, (c) => `/sessions/${c.sC}`),
  ...coachResource("post", (c) => `/sessions/${c.sA}/restore`, (c) => `/sessions/${c.sC}/restore`),
  ...coachResource("post", (c) => `/sessions/${c.sA}/duplicate`, (c) => `/sessions/${c.sC}/duplicate`, () => ({ scheduledDate: iso })),
  ...coachResource("post", (c) => `/sessions/${c.sA}/exercises`, (c) => `/sessions/${c.sC}/exercises`, (c) => ({ exerciseId: c.globalExercise, targetSets: 3, targetReps: 8 })),
  ...coachResource("patch", (c) => `/session-exercises/${c.seA}`, (c) => `/session-exercises/${c.seC}`, () => ({ targetSets: 4 })),
  ...coachResource("delete", (c) => `/session-exercises/${c.seA}`, (c) => `/session-exercises/${c.seC}`),

  // Rutinas
  { method: "get", path: () => "/routines", cases: [noSession(), wrongRoleCoachOnly()] },
  { method: "post", path: (c) => "/routines", body: (c) => ({ name: "R", exercises: [{ exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8 }] }), cases: [noSession(), wrongRoleCoachOnly()] },
  {
    method: "post",
    path: () => "/routines",
    body: (c) => ({ name: "R", exercises: [{ exerciseId: c.exerciseB, defaultSets: 3, defaultReps: 8 }] }),
    cases: [["coachA", 400, "usar el ejercicio propio de otro coach"]],
  },
  { method: "get", path: (c) => `/routines/${c.routineA}`, cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
  { method: "patch", path: (c) => `/routines/${c.routineA}`, body: () => ({ name: "Otro" }), cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
  { method: "delete", path: (c) => `/routines/${c.routineA}`, cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
  // Estructura completa con bloques (CYC-275): la misma propiedad que la rutina y la sesión.
  { method: "patch", path: (c) => `/routines/${c.routineA}`, body: (c) => ({ blocks: [{ type: "warmup", name: "Calentamiento", exercises: [{ exerciseId: c.globalExercise, defaultSets: 2, defaultReps: 10 }] }] }), cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
  ...coachResource("put", (c) => `/sessions/${c.sA}/structure`, (c) => `/sessions/${c.sC}/structure`, (c) => ({ blocks: [{ type: "warmup", name: "Calentamiento", exercises: [{ exerciseId: c.globalExercise, targetSets: 2, targetReps: 10 }] }] })),

  // Ejercicios
  { method: "get", path: () => "/exercises", cases: [noSession()] },
  { method: "post", path: () => "/exercises", body: () => ({ name: "Nuevo e2e", muscleGroup: "legs", equipment: ["barbell"] }), cases: [noSession(), wrongRoleCoachOnly()] },
  { method: "patch", path: (c) => `/exercises/${c.exerciseA}`, body: () => ({ name: "Renombrado" }), cases: [noSession(), wrongRoleCoachOnly(), ["coachB", 403, "ejercicio propio de otro coach"]] },
  { method: "patch", path: (c) => `/exercises/${c.globalExercise}`, body: () => ({ name: "Renombrado" }), cases: [["coachA", 403, "ejercicio del catálogo global"]] },
  { method: "patch", path: (c) => `/exercises/${c.exerciseA}/deactivate`, cases: [noSession(), wrongRoleCoachOnly(), ["coachB", 403, "ejercicio propio de otro coach"]] },
  { method: "patch", path: (c) => `/exercises/${c.globalExercise}/deactivate`, cases: [["coachA", 403, "ejercicio del catálogo global"]] },

  // Ejecución (atleta)
  { method: "get", path: () => "/me/today", cases: [noSession(), wrongRoleAthleteOnly()] },
  { method: "get", path: (c) => `/me/summary?cycleId=${c.cycleA}`, cases: [noSession(), wrongRoleAthleteOnly(), ["athleteB", DENIED, "ciclo de otro atleta"]] },
  ...(["schedule", "start", "reopen", "feedback"] as const).map((action): Row => ({
    method: action === "schedule" ? "patch" : "post",
    path: (c) => `/sessions/${c.sA}/${action}`,
    body: () => (action === "schedule" ? { date: "2030-01-07" } : action === "feedback" ? { outcome: "completed", srpe: 5, durationMinutes: 30 } : {}),
    cases: [noSession(), wrongRoleAthleteOnly(), ["athleteB", DENIED, "sesión de otro atleta"], ["athleteC", DENIED, "sesión de otro atleta (relación terminada)"]],
  })),
  {
    method: "post",
    path: (c) => `/session-exercises/${c.seA}/logs`,
    body: () => ({ id: randomUUID(), setNumber: 1, actualReps: 8 }),
    cases: [noSession(), wrongRoleAthleteOnly(), ["athleteB", DENIED, "serie de otro atleta"]],
  },

  // Seguimiento (coach)
  { method: "get", path: () => "/coach/attention", cases: [noSession(), wrongRoleCoachOnly()] },
  // Actividades paralelas del atleta (CYC-251): solo el atleta gestiona las suyas; el coach solo lee las de sus atletas.
  { method: "get", path: () => "/me/events?from=2026-11-01&to=2026-11-30", cases: [noSession(), wrongRoleAthleteOnly()] },
  { method: "post", path: () => "/me/events", body: () => ({ type: "match", title: "Liga", date: "2026-11-07" }), cases: [noSession(), wrongRoleAthleteOnly()] },
  { method: "patch", path: () => "/me/events/no-existe", body: () => ({ scope: "series", title: "x" }), cases: [noSession(), wrongRoleAthleteOnly(), ["athleteA", 404, "actividad que no existe"]] },
  { method: "delete", path: () => "/me/events/no-existe?scope=series", cases: [noSession(), wrongRoleAthleteOnly(), ["athleteA", 404, "actividad que no existe"]] },
  { method: "get", path: (c) => `/athletes/${c.userId.athleteA}/events?from=2026-11-01&to=2026-11-30`, cases: [noSession(), wrongRoleCoachOnly(), notOwnerCoach()] },
  { method: "get", path: (c) => `/athletes/${c.userId.athleteC}/events?from=2026-11-01&to=2026-11-30`, cases: [["coachA", 403, "relación con el atleta terminada"]] },
  // Pizarra del Resumen (CYC-238): solo coach, y siempre la suya.
  { method: "get", path: () => "/coach/summary-layout", cases: [noSession(), wrongRoleCoachOnly()] },
  { method: "put", path: () => "/coach/summary-layout", body: () => ({ charts: [] }), cases: [noSession(), wrongRoleCoachOnly()] },
  // Historial por ejercicio del atleta (CYC-239): solo atleta, y siempre el suyo.
  { method: "get", path: () => "/me/exercise-progress", cases: [noSession(), wrongRoleAthleteOnly()] },
  { method: "get", path: (c) => `/athletes/${c.userId.athleteA}/summary`, cases: [noSession(), wrongRoleCoachOnly(), ["coachB", 403, "atleta de otro coach"]] },
  { method: "get", path: (c) => `/athletes/${c.userId.athleteC}/summary`, cases: [["coachA", 403, "relación terminada"]] },
  ...coachResource("get", (c) => `/cycles/${c.cycleA}/progress`, (c) => `/cycles/${c.cycleC}/progress`),
  ...coachResource("post", (c) => `/cycles/${c.cycleA}/load-adjustments`, (c) => `/cycles/${c.cycleC}/load-adjustments`, (c) => ({ exerciseId: c.globalExercise, fromWeek: 1, percentChange: 5 })),

  // Avisos y perfil
  { method: "get", path: () => "/notifications", cases: [noSession()] },
  { method: "get", path: () => "/notifications/unread-count", cases: [noSession()] },
  { method: "post", path: () => "/notifications/read-all", cases: [noSession()] },
  { method: "post", path: (c) => `/notifications/${c.notificationB}/read`, cases: [noSession(), ["athleteA", DENIED, "aviso de otra persona"], ["coachA", DENIED, "aviso de otra persona"]] },
  { method: "get", path: () => "/users/me", cases: [noSession()] },
  { method: "post", path: () => "/users/me/policy-acceptance", body: () => ({ acceptPolicy: true }), cases: [noSession()] },
  { method: "get", path: () => "/users/me/export", cases: [noSession()] },
  { method: "post", path: () => "/users/me/news-seen", body: () => ({ key: "routine-blocks@1" }), cases: [noSession()] },
  { method: "patch", path: () => "/users/me/tour", body: () => ({ status: "skipped" }), cases: [noSession()] },
  { method: "post", path: () => "/auth/apple/link", body: () => ({ idToken: "x", nonce: "n".repeat(20) }), cases: [noSession()] },
  { method: "patch", path: () => "/users/me/data-consent", body: () => ({ dataConsent: false }), cases: [noSession()] },
  { method: "delete", path: () => "/users/me", body: () => ({ confirmation: "ELIMINAR" }), cases: [noSession()] },
];

// Para escribir el nombre de cada prueba antes de que exista el escenario.
const placeholder = new Proxy({}, { get: (_t, key) => (typeof key === "string" ? `:${key}` : undefined) }) as unknown as Scenario;

const flat = rows.flatMap((row) => row.cases.map(([who, expected, why]) => ({ row, who, expected, why })));

describe("Matriz de autorización", () => {
  let app: TestApp;
  let c: Scenario;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(flat.map((f, i) => [`${f.row.method.toUpperCase()} ${f.row.path(placeholder)} · ${f.who} (${f.why})`, i] as const))("%s", async (_name, i) => {
    const { row, who, expected } = flat[i];
    const req = app.http(row.method, row.path(c), who === "none" ? undefined : c.token[who]);
    const res = await (row.body ? req.send(row.body(c)) : req);
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(res.status)) {
      throw new Error(`${row.method.toUpperCase()} ${row.path(c)} como ${who}: se esperaba ${allowed.join(" o ")} y respondió ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  describe("cada persona ve solo lo suyo (pruebas positivas)", () => {
    it("el coach ve su ciclo y el atleta su ciclo", async () => {
      expect((await app.http("get", `/cycles/${c.cycleA}`, c.token.coachA)).status).toBe(200);
      expect((await app.http("get", `/cycles/${c.cycleA}`, c.token.athleteA)).status).toBe(200);
    });

    it("el atleta conserva el acceso a su historial aunque su relación con el coach terminó", async () => {
      expect((await app.http("get", `/sessions/${c.sC}`, c.token.athleteC)).status).toBe(200);
      expect((await app.http("get", `/cycles/${c.cycleC}`, c.token.athleteC)).status).toBe(200);
    });

    it("la lista de ciclos del coach no incluye los de otro coach", async () => {
      const res = await app.http("get", "/cycles", c.token.coachA);
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((x) => x.id);
      expect(ids).toContain(c.cycleA);
      expect(ids).not.toContain(c.cycleB);
    });

    it("la lista de atletas del coach no incluye a los de otro coach", async () => {
      const res = await app.http("get", "/athletes", c.token.coachA);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).toContain("atleta.a@e2e.test");
      expect(JSON.stringify(res.body)).not.toContain("atleta.b@e2e.test");
    });

    it("las rutinas y los ejercicios propios de un coach no aparecen al otro", async () => {
      const routines = await app.http("get", "/routines", c.token.coachB);
      expect(JSON.stringify(routines.body)).not.toContain(c.routineA);
      const exercises = await app.http("get", "/exercises", c.token.coachB);
      expect(JSON.stringify(exercises.body)).not.toContain(c.exerciseA);
      const asAthlete = await app.http("get", "/exercises", c.token.athleteA);
      expect(JSON.stringify(asAthlete.body)).not.toContain(c.exerciseA);
    });

    it("los avisos de una persona no aparecen a otra", async () => {
      const res = await app.http("get", "/notifications", c.token.athleteA);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(c.notificationB);
    });

    it("la exportación de datos de una persona no incluye lo de otra", async () => {
      const res = await app.http("get", "/users/me/export", c.token.athleteA);
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).toContain("atleta.a@e2e.test");
      expect(text).not.toContain("atleta.b@e2e.test");
      expect(text).not.toContain(c.cycleB);
    });

    it("eliminar la cuenta exige escribir ELIMINAR y no toca la de otra persona", async () => {
      const wrong = await app.http("delete", "/users/me", c.token.athleteC).send({ confirmation: "eliminar" });
      expect(wrong.status).toBe(400);
      expect(await app.prisma.user.findUnique({ where: { id: c.userId.athleteC } })).not.toBeNull();
    });

    it("las plantillas de un coach no aparecen a su atleta", async () => {
      const res = await app.http("get", "/cycles?templates=include", c.token.athleteA);
      expect(JSON.stringify(res.body)).not.toContain(c.templateA);
    });
  });
});
