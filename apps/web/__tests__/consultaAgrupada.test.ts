import { athleteSessions, athleteWeek, cycleCoachSessions, getBoardEvents, getBoardSessions, type BoardData } from "../src/services/boardApi";
import { heavyThreshold, loadClashes } from "../src/lib/loadClash";
import { apiRequest } from "../src/services/httpClient";

jest.mock("../src/services/httpClient", () => ({ apiRequest: jest.fn() }));
const request = apiRequest as jest.MockedFunction<typeof apiRequest>;

const cycle = (id: string, athleteId: string, startDate = "2026-11-02") => ({
  id,
  athleteId,
  name: id,
  startDate: `${startDate}T00:00:00.000Z`,
  endDate: "2026-12-27T00:00:00.000Z",
  sessionsPerWeek: 3,
  teamCycleId: null,
  parentCycleId: null,
});
const session = (id: string, cycleId: string, weekNumber: number, slotNumber: number, over: object = {}) => ({
  id,
  cycleId,
  name: id,
  weekNumber,
  slotNumber,
  status: "pending" as const,
  teamSessionId: null,
  plannedSets: 3,
  ...over,
});

describe("consulta agrupada del coach (CYC-325)", () => {
  const data: BoardData = {
    cycles: [cycle("c1", "a"), cycle("c2", "a"), cycle("c3", "b")],
    sessions: [
      session("segunda", "c1", 4, 2),
      session("primera", "c1", 4, 1),
      session("otra-semana", "c1", 5, 1),
      session("movida", "c1", 6, 1, { scheduledDate: "2026-11-26T00:00:00.000Z", plannedSets: 9 }),
      session("del-segundo-ciclo", "c2", 4, 1),
      session("de-otro", "c3", 4, 1),
    ],
  };

  it("reparte por atleta, calcula el día de cada sesión y deja solo las del tramo", () => {
    expect(athleteWeek(data, "a", "2026-11-23").map((s) => [s.id, s.dayIso])).toEqual([
      ["primera", "2026-11-23"],
      ["segunda", "2026-11-25"],
      ["del-segundo-ciclo", "2026-11-23"],
    ]);
    expect(athleteWeek(data, "b", "2026-11-23").map((s) => s.id)).toEqual(["de-otro"]);
    expect(athleteSessions(data, "nadie", "2026-11-23", "2026-11-29")).toEqual([]);
  });

  it("para el choque de carga usa el umbral de todo el ciclo, no el de los días que llegaron", () => {
    // Solo llega la sesión de 9 series; el ciclo completo tiene además sesiones más pesadas.
    const sessions = cycleCoachSessions(data, "c1");
    expect(sessions).toEqual([{ id: "movida", name: "movida", date: "2026-11-26", volume: 9 }]);
    const match = [{ type: "match", date: "2026-11-27", intensity: null }] as never;
    const threshold = (volumes: number[]) => heavyThreshold(volumes.map((volume) => ({ volume })));
    expect(loadClashes(sessions, match, threshold([9, 4, 4, 4, 4, 4]))).toHaveLength(1);
    expect(loadClashes(sessions, match, threshold([9, 12, 14, 4, 4, 4]))).toHaveLength(0);
  });

  it("junta las páginas siguiendo el cursor", async () => {
    request.mockReset();
    request
      .mockResolvedValueOnce({ cycles: [cycle("c1", "a")], sessions: [session("uno", "c1", 1, 1)], nextCursor: "uno" })
      .mockResolvedValueOnce({ cycles: [], sessions: [session("dos", "c1", 1, 2)], nextCursor: null });
    const result = await getBoardSessions("2026-11-23", "2026-11-29", { teamId: "t", volumes: true });
    expect(result.cycles).toHaveLength(1);
    expect(result.sessions.map((s) => s.id)).toEqual(["uno", "dos"]);
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      "/coach/board/sessions?from=2026-11-23&to=2026-11-29&teamId=t&volumes=true",
      "/coach/board/sessions?from=2026-11-23&to=2026-11-29&teamId=t&volumes=true&cursor=uno",
    ]);
  });

  it("si una página falla, falla la consulta: no se muestran datos a medias", async () => {
    request.mockReset();
    request.mockResolvedValueOnce({ events: [], nextCursor: "x" }).mockRejectedValueOnce(new Error("429"));
    await expect(getBoardEvents("2026-11-23", "2026-11-29")).rejects.toThrow("429");
  });
});
