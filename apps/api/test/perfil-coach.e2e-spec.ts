import { ConfigService } from "@nestjs/config";
import { CoachProfileService } from "../src/coach-profile/coach-profile.service";
import { InvitationsService } from "../src/invitations/invitations.service";
import { MailService } from "../src/mail/mail.service";
import { PASSWORD, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";

// Perfil del coach (CYC-295): preguntas del registro y de la encuesta.

const ALL: [string, string[], string?][] = [
  ["places", ["cancha", "otro"], "Plaza del barrio"],
  ["modes", ["equipos", "uno-a-uno"]],
  ["sports", ["voleibol", "otro"], "  vóleibol\nplaya  "],
  ["athleteRange", ["16-40"]],
  ["tools", ["planillas", "mensajes"]],
  ["pains", ["seguimiento"]],
  ["trainingTypes", ["fuerza", "potencia"]],
];

describe("Perfil del coach", () => {
  let app: TestApp;
  let surveyOn = false;

  beforeAll(async () => {
    const original = ConfigService.prototype.get;
    jest.spyOn(ConfigService.prototype, "get").mockImplementation(function (this: ConfigService, ...args: unknown[]) {
      if (args[0] === "COACH_SURVEY_ENABLED") return surveyOn ? "true" : undefined;
      if (args[0] === "INVITATIONS_ENABLED") return "true";
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    });
    app = await startApp();
  });
  beforeEach(async () => {
    surveyOn = false;
    await resetDatabase(app.prisma);
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  const mk = async (email: string, role: "coach" | "athlete" = "coach", over: Record<string, unknown> = {}) =>
    app.prisma.user.create({ data: { email, name: "Persona", role, passwordHash: await passwordHash(), emailVerifiedAt: new Date(), ...over } });
  const login = async (email: string) => (await app.http("post", "/auth/login").send({ email, password: PASSWORD })).body.accessToken as string;
  const answer = (token: string, question: string, values: string[], other?: string) =>
    app.http("patch", "/users/me/coach-profile", token).send({ question, values, other });
  const me = async (token: string) => (await app.http("get", "/users/me", token)).body;

  it("apagada: una cuenta anterior no tiene preguntas y no se guarda nada", async () => {
    await mk("coach@e2e.test");
    const token = await login("coach@e2e.test");
    expect((await me(token)).coachSurvey).toBeNull();
    const res = await answer(token, "places", ["gimnasio"]);
    expect(res.status).toBe(409);
    expect(await app.prisma.coachProfile.count()).toBe(0);
    expect((await app.http("get", "/users/me/coach-profile", token)).body).toMatchObject({ pending: null, lastStep: 0, completedAt: null });
  });

  it("encendida: se guarda cada respuesta, se retoma donde quedó y al terminar deja de pedirse", async () => {
    surveyOn = true;
    await mk("coach@e2e.test");
    const token = await login("coach@e2e.test");
    expect((await me(token)).coachSurvey).toBe("survey");
    expect(await app.prisma.coachProfile.count()).toBe(0);

    for (const [i, [question, values, other]] of ALL.entries()) {
      const res = await answer(token, question, values, other);
      expect(res.status).toBe(200);
      expect(res.body.lastStep).toBe(i + 1);
      expect(res.body.completedAt === null).toBe(i < ALL.length - 1);
    }
    expect((await me(token)).coachSurvey).toBeNull();
    const row = (await app.prisma.coachProfile.findFirstOrThrow())!;
    expect(row).toMatchObject({ origin: "survey", lastStep: 7, athleteRange: "16-40", modes: ["uno-a-uno", "equipos"], noSpecificSport: false });
    // «Otro» queda en una línea y sin espacios de más.
    expect(row.otherTexts).toEqual({ places: "Plaza del barrio", sports: "vóleibol playa" });

    // Reenviar la última respuesta (corte de red) no falla; cambiar ya no se puede.
    expect((await answer(token, "trainingTypes", ["fuerza", "potencia"])).status).toBe(200);
    expect((await answer(token, "trainingTypes", ["movilidad"])).status).toBe(409);
  });

  it("cambiar una respuesta antes de terminar la reemplaza y quita su «Otro»", async () => {
    surveyOn = true;
    await mk("coach@e2e.test");
    const token = await login("coach@e2e.test");
    await answer(token, "places", ["otro"], "Plaza");
    const res = await answer(token, "places", ["online"], "esto se ignora");
    expect(res.body.answers.places).toEqual(["online"]);
    expect(res.body.otherTexts).toEqual({});
  });

  it("«No hacen un deporte específico» excluye al resto y cuenta como respuesta", async () => {
    surveyOn = true;
    await mk("coach@e2e.test");
    const token = await login("coach@e2e.test");
    expect((await answer(token, "sports", ["voleibol", "sin-deporte-especifico"])).status).toBe(400);
    const res = await answer(token, "sports", ["sin-deporte-especifico"]);
    expect(res.body.answers.sports).toEqual(["sin-deporte-especifico"]);
    expect(await app.prisma.coachProfile.findFirst()).toMatchObject({ noSpecificSport: true, sports: [] });
  });

  it("rechaza lo que no es una respuesta válida", async () => {
    surveyOn = true;
    await mk("coach@e2e.test");
    const token = await login("coach@e2e.test");
    for (const [question, values, other] of [
      ["places", []],
      ["places", ["playa"]],
      ["pains", ["ajustar", "seguimiento", "organizar"]],
      ["athleteRange", ["1-5", "6-15"]],
      ["tools", ["sin-registro", "papel"]],
      ["salud", ["x"]],
      ["places", ["otro"], "x".repeat(61)],
    ] as [string, string[], string?][]) {
      expect((await answer(token, question, values, other)).status).toBe(400);
    }
    expect(await app.prisma.coachProfile.count()).toBe(0);
  });

  it("dos respuestas a la vez no se pisan", async () => {
    surveyOn = true;
    const coach = await mk("coach@e2e.test");
    const service = app.app.get(CoachProfileService);
    await Promise.all([service.answer(coach.id, "places", ["otro"], "Plaza"), service.answer(coach.id, "modes", ["otro"], "Clínicas")]);
    expect((await app.prisma.coachProfile.findFirstOrThrow()).otherTexts).toEqual({ places: "Plaza", modes: "Clínicas" });
  });

  it("atletas y demos no la ven ni pueden responder; sin sesión, 401", async () => {
    surveyOn = true;
    await mk("atleta@e2e.test", "athlete");
    await mk("demo@e2e.test", "coach", { isDemo: true });
    const athlete = await login("atleta@e2e.test");
    expect((await me(athlete)).coachSurvey).toBeNull();
    expect((await answer(athlete, "places", ["online"])).status).toBe(403);
    const demo = await login("demo@e2e.test");
    expect((await me(demo)).coachSurvey).toBeNull();
    expect((await answer(demo, "places", ["online"])).status).toBe(409);
    expect((await app.http("get", "/users/me/coach-profile")).status).toBe(401);
    expect(await app.prisma.coachProfile.count()).toBe(0);
  });

  it("quien se registra como coach con invitación responde como parte del registro, aun con la encuesta apagada", async () => {
    let link = "";
    jest.spyOn(app.app.get(MailService), "sendPilotInvitationEmail").mockImplementation(async (_to, token) => {
      link = token;
    });
    await app.prisma.contactRequest.create({ data: { email: "nueva@e2e.test", message: "Entreno vóleibol." } });
    await app.app.get(InvitationsService).request("nueva@e2e.test", "equipo@e2e.test");
    const res = await app
      .http("post", "/auth/register")
      .send({ name: "Nueva", email: "nueva@e2e.test", password: PASSWORD, role: "coach", acceptPolicy: true, invitationToken: link });
    expect(res.status).toBe(201);
    expect((await me(res.body.accessToken)).coachSurvey).toBe("register");
    expect((await answer(res.body.accessToken, "places", ["online"])).status).toBe(200);
    // Si lo deja a medias, sigue siendo del registro aunque se encienda la encuesta.
    surveyOn = true;
    expect((await me(res.body.accessToken)).coachSurvey).toBe("register");
  });

  it("para admin: completa, a medias, sin responder y nada para atletas o demos", async () => {
    surveyOn = true;
    const [done, partial, none, athlete, demo] = [
      await mk("completa@e2e.test"),
      await mk("medias@e2e.test"),
      await mk("sin@e2e.test"),
      await mk("atleta@e2e.test", "athlete"),
      await mk("demo@e2e.test", "coach", { isDemo: true }),
    ];
    const service = app.app.get(CoachProfileService);
    for (const [question, values, other] of ALL) await service.answer(done.id, question as never, values, other);
    for (const [question, values, other] of ALL.slice(0, 3)) await service.answer(partial.id, question as never, values, other);

    const full = await service.forAdmin(done);
    expect(full).toMatchObject({ status: "complete", answered: 7, total: 7 });
    expect(full!.questions[0]).toEqual({ label: "Dónde entrena", answer: "Cancha, Otro: Plaza del barrio" });
    expect(full!.questions[2]).toEqual({ label: "Deportes de sus deportistas", answer: "🏐 Vóleibol, ➕ Otro deporte: vóleibol playa" });
    const half = await service.forAdmin(partial);
    expect(half).toMatchObject({ status: "partial", answered: 3 });
    expect(half!.questions.filter((q) => q.answer === null)).toHaveLength(4);
    expect(await service.forAdmin(none)).toMatchObject({ status: "none", questions: [] });
    expect(await service.forAdmin(athlete)).toBeNull();
    expect(await service.forAdmin(demo)).toBeNull();
  });

  it("sale en «Descargar mis datos» y se borra al eliminar la cuenta", async () => {
    surveyOn = true;
    // Otro correo: el límite de intentos de inicio de sesión es por correo.
    await mk("exporta@e2e.test");
    const token = await login("exporta@e2e.test");
    await answer(token, "places", ["otro"], "Plaza");
    expect((await app.http("get", "/users/me/export", token)).body.coachProfile).toMatchObject({ places: ["otro"], otherTexts: { places: "Plaza" } });
    expect((await app.http("delete", "/users/me", token).send({ confirmation: "ELIMINAR" })).status).toBe(204);
    expect(await app.prisma.coachProfile.count()).toBe(0);
  });
});
