import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Nota del coach por ejercicio (CYC-60). Una por ejercicio, en la rutina (valor por
// defecto) y en la sesión (copiada y editable). Texto libre que puede mencionar la
// salud: la ven solo el coach dueño y el atleta de esa sesión, y nunca va en los avisos.

const DENIED = [403, 404];
const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

describe("Notas por ejercicio", () => {
  let app: TestApp;
  let c: Scenario;
  let routineId: string;
  let sessionId: string;
  let sessionExerciseId: string;

  const notaDe = async (token: string, id = sessionId) => {
    const res = await app.http("get", `/sessions/${id}`, token);
    expect(res.status).toBe(200);
    return res.body.sessionExercises[0].note as string | null;
  };

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);

    const routine = await app.http("post", "/routines", c.token.coachA).send({
      name: "Con nota",
      exercises: [{ exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8, note: "  Cuida el hombro; baja lento.  " }],
    });
    expect(routine.status).toBe(201);
    routineId = routine.body.id;

    const session = await app.http("post", `/cycles/${c.cycleA}/sessions`, c.token.coachA).send({ routineId, weekNumber: 2, slotNumber: 1 });
    expect(session.status).toBe(201);
    sessionId = session.body.id;
    sessionExerciseId = session.body.sessionExercises[0].id;
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("de la rutina a la sesión", () => {
    it("la rutina guarda la nota sin espacios de más", async () => {
      const res = await app.http("get", `/routines/${routineId}`, c.token.coachA);
      expect(res.body.routineExercises[0].note).toBe("Cuida el hombro; baja lento.");
    });

    it("al asignar la rutina, la sesión recibe la nota y el atleta la ve", async () => {
      expect(await notaDe(c.token.coachA)).toBe("Cuida el hombro; baja lento.");
      expect(await notaDe(c.token.athleteA)).toBe("Cuida el hombro; baja lento.");
    });

    it("cambiar la nota de la rutina no cambia la de la sesión ya asignada (es una copia)", async () => {
      const upd = await app.http("patch", `/routines/${routineId}`, c.token.coachA).send({
        exercises: [{ exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8, note: "Otra cosa" }],
      });
      expect(upd.status).toBe(200);
      expect(await notaDe(c.token.athleteA)).toBe("Cuida el hombro; baja lento.");
    });

    it("duplicar la sesión copia la nota", async () => {
      const copy = await app.http("post", `/sessions/${sessionId}/duplicate`, c.token.coachA).send({ scheduledDate: inTenDays() });
      expect(copy.status).toBeLessThan(300);
      expect(await notaDe(c.token.coachA, copy.body.id)).toBe("Cuida el hombro; baja lento.");
    });

    it("agregar un ejercicio a la sesión con nota la guarda", async () => {
      const added = await app.http("post", `/sessions/${sessionId}/exercises`, c.token.coachA).send({
        exerciseId: c.globalExercise,
        targetSets: 2,
        targetReps: 10,
        note: "Sin peso la primera serie",
      });
      expect(added.status).toBe(201);
      expect(added.body.note).toBe("Sin peso la primera serie");
    });
  });

  describe("editar la nota de la sesión", () => {
    const patch = (token: string, note: string) => app.http("patch", `/session-exercises/${sessionExerciseId}`, token).send({ note });

    it("el coach dueño la cambia y el atleta ve el cambio", async () => {
      expect((await patch(c.token.coachA, "  Nueva indicación  ")).status).toBe(200);
      expect(await notaDe(c.token.athleteA)).toBe("Nueva indicación");
    });

    it("una nota vacía la borra", async () => {
      expect((await patch(c.token.coachA, "   ")).status).toBe(200);
      expect(await notaDe(c.token.athleteA)).toBeNull();
      await patch(c.token.coachA, "Nueva indicación");
    });

    it("más de 500 caracteres da 400 y no cambia nada", async () => {
      const res = await patch(c.token.coachA, "x".repeat(501));
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain("500 caracteres");
      expect(await notaDe(c.token.athleteA)).toBe("Nueva indicación");
    });

    it("500 caracteres exactos sí se aceptan", async () => {
      expect((await patch(c.token.coachA, "y".repeat(500))).status).toBe(200);
      await patch(c.token.coachA, "Nueva indicación");
    });

    it("sin sesión, el atleta o un coach ajeno no pueden escribirla", async () => {
      const body = { note: "intruso" };
      expect((await app.http("patch", `/session-exercises/${sessionExerciseId}`).send(body)).status).toBe(401);
      expect((await patch(c.token.athleteA, "intruso")).status).toBe(403);
      expect(DENIED).toContain((await patch(c.token.coachB, "intruso")).status);
      expect(await notaDe(c.token.athleteA)).toBe("Nueva indicación");
    });
  });

  describe("quién puede leerla", () => {
    it("otro atleta y otro coach no ven la sesión ni su nota", async () => {
      expect(DENIED).toContain((await app.http("get", `/sessions/${sessionId}`, c.token.athleteB)).status);
      expect(DENIED).toContain((await app.http("get", `/sessions/${sessionId}`, c.token.coachB)).status);
    });

    it("un atleta no puede crear rutinas con nota", async () => {
      const res = await app.http("post", "/routines", c.token.athleteA).send({
        name: "x",
        exercises: [{ exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8, note: "x" }],
      });
      expect(res.status).toBe(403);
    });

    it("la rutina de un coach no deja leer su nota a otro coach", async () => {
      expect(DENIED).toContain((await app.http("get", `/routines/${routineId}`, c.token.coachB)).status);
    });
  });

  describe("privacidad", () => {
    it("el texto de ninguna nota aparece en ningún aviso", async () => {
      await app.http("patch", `/session-exercises/${sessionExerciseId}`, c.token.coachA).send({ note: "Dolor de hombro secreto" });
      const notas = [
        ...(await app.prisma.sessionExercise.findMany({ select: { note: true } })),
        ...(await app.prisma.routineExercise.findMany({ select: { note: true } })),
      ]
        .map((n) => n.note)
        .filter((n): n is string => Boolean(n));
      expect(notas.length).toBeGreaterThanOrEqual(4); // hay varias notas distintas en la base...
      const avisos = JSON.stringify(await app.prisma.notification.findMany());
      expect(avisos.length).toBeGreaterThan(10); // ...y el cambio sí generó avisos...
      for (const nota of notas) expect(avisos).not.toContain(nota); // ...pero ninguno lleva el texto
    });

    it("la exportación de datos del atleta incluye la nota de su plan", async () => {
      const res = await app.http("get", "/users/me/export", c.token.athleteA);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).toContain("Dolor de hombro secreto");
    });
  });
});
