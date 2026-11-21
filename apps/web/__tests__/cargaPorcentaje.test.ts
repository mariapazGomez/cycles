import { isValidPercent, loadPayload, rowFromRoutine, toInput, type Row } from "../src/lib/routineRows";
import { sessionPayload } from "../src/lib/sessionDraft";

const base: Row = { key: "k", exerciseId: "e1", name: "Sentadilla", muscleGroup: undefined, sets: "4", reps: "6", weight: "", restSeconds: "", rir: "", note: "", blockId: null };

describe("carga: peso fijo o % del RM", () => {
  it("valida el % como entero de 1 a 100", () => {
    expect(isValidPercent("80")).toBe(true);
    expect(["0", "101", "7,5", "", "abc"].some(isValidPercent)).toBe(false);
  });
  it("solo guarda el modo activo, nunca ambos", () => {
    expect(loadPayload({ ...base, weight: "60", loadMode: "kg", percentRm: "80" })).toEqual({ weight: 60 });
    expect(loadPayload({ ...base, weight: "60", loadMode: "percent", percentRm: "80" })).toEqual({ percent: 80 });
    expect(loadPayload({ ...base, loadMode: "percent", percentRm: "" })).toEqual({});
    expect(loadPayload({ ...base, loadMode: "percent", percentRm: "150" })).toEqual({});
  });
  it("la rutina guarda defaultPercentRm sin defaultWeight", () => {
    const input = toInput({ ...base, weight: "60", loadMode: "percent", percentRm: "75" });
    expect(input.defaultPercentRm).toBe(75);
    expect(input.defaultWeight).toBeUndefined();
  });
  it("al abrir una rutina con % la fila queda en modo %", () => {
    const row = rowFromRoutine("k", {
      id: "r", routineId: "x", exerciseId: "e1", orderIndex: 0, defaultSets: 3, defaultReps: 10, defaultPercentRm: 70,
      exercise: { id: "e1", name: "Hip thrust", equipment: [], isActive: true },
    } as never);
    expect(row.loadMode).toBe("percent");
    expect(row.percentRm).toBe("70");
  });
  it("la sesión guarda targetPercentRm sin targetWeight", () => {
    const payload = sessionPayload({ blocks: [], rows: [{ ...base, weight: "60", loadMode: "percent", percentRm: "80" }] });
    expect(payload.exercises[0]).toMatchObject({ targetPercentRm: 80 });
    expect(payload.exercises[0]).not.toHaveProperty("targetWeight");
  });
});
