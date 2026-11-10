import { routineDrawerFromParams, routineDrawerPath } from "../src/lib/library";
import { routineSummaryLine } from "../src/lib/routineDraft";
import { dismissMovedNotice, shouldShowMovedNotice } from "../src/lib/movedNotice";

// CYC-275, paso 2: un solo acceso al constructor (el cajón sobre la Biblioteca).
describe("dirección del cajón de rutinas", () => {
  it("crear y editar van a la Biblioteca con ?rutina=", () => {
    expect(routineDrawerPath({ kind: "new" })).toBe("/biblioteca?tipo=rutinas&rutina=nueva");
    expect(routineDrawerPath({ kind: "edit", id: "abc-123" })).toBe("/biblioteca?tipo=rutinas&rutina=abc-123");
  });

  it("se lee de la dirección y ida y vuelta da lo mismo", () => {
    const read = (url: string) => routineDrawerFromParams(new URL(url, "http://x").searchParams);
    expect(read("/biblioteca")).toBeNull();
    expect(read("/biblioteca?tipo=rutinas&rutina=nueva")).toEqual({ kind: "new" });
    expect(read(routineDrawerPath({ kind: "edit", id: "r 1/2" }))).toEqual({ kind: "edit", id: "r 1/2" });
  });
});

describe("línea de carga del cajón", () => {
  it("resume series, duración y volumen", () => {
    expect(routineSummaryLine({ sets: 7, durationMinutes: 24, volumeKg: 2400 })).toBe("7 series · ~24 min · 2400 kg");
    expect(routineSummaryLine({ sets: 1, durationMinutes: 2, volumeKg: 0 })).toBe("1 serie · ~2 min · 0 kg");
  });
  it("queda vacía mientras no hay series completas", () => {
    expect(routineSummaryLine({ sets: 0, durationMinutes: 0, volumeKg: 0 })).toBe("");
  });
});

describe("aviso de una sola vez", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it("se muestra hasta que la persona lo descarta, y no vuelve", () => {
    const store = memory();
    expect(shouldShowMovedNotice(store)).toBe(true);
    dismissMovedNotice(store);
    expect(shouldShowMovedNotice(store)).toBe(false);
  });

  it("sin almacenamiento o con error de lectura no rompe nada", () => {
    expect(shouldShowMovedNotice(null)).toBe(true);
    expect(() => dismissMovedNotice(null)).not.toThrow();
    const broken = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
    expect(shouldShowMovedNotice(broken)).toBe(true);
    expect(() => dismissMovedNotice(broken)).not.toThrow();
  });
});
