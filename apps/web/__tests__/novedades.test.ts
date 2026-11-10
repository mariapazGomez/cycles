import {
  CURRENT_NOVELTY_KEYS,
  MAX_NOVELTY_SLIDES,
  MAX_NOVELTY_TEXT,
  NOVELTIES,
  noveltiesFor,
  noveltyKey,
  pendingNovelty,
  visibleSlides,
  type Novelty,
} from "@cycles/shared";
import { canShowNovelty, isBuilderPath, noveltyConditions } from "../src/lib/novelty";

const coach = { role: "coach", platform: "web" } as const;
const fake = (over: Partial<Novelty>): Novelty => ({ ...NOVELTIES[0], ...over });

describe("fichas de novedad (registro)", () => {
  it("las claves son únicas", () => {
    expect(new Set(CURRENT_NOVELTY_KEYS).size).toBe(NOVELTIES.length);
  });

  it.each(NOVELTIES.map((n) => [noveltyKey(n), n] as const))("%s: de 2 a 4 slides con textos cortos y demostración", (_key, n) => {
    expect(n.slides.length).toBeGreaterThanOrEqual(2);
    expect(n.slides.length).toBeLessThanOrEqual(MAX_NOVELTY_SLIDES);
    for (const s of n.slides) {
      expect(s.text.length).toBeLessThanOrEqual(MAX_NOVELTY_TEXT);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.demoLabel.length).toBeGreaterThan(0);
      expect(Boolean(s.demo) || Boolean(s.video && s.poster)).toBe(true);
    }
  });
});

describe("qué novedad toca mostrar", () => {
  it("la coach ve la de bloques; la atleta y el admin, ninguna", () => {
    expect(pendingNovelty([], coach)?.key).toBe("routine-blocks");
    expect(pendingNovelty([], { role: "athlete", platform: "web" })).toBeNull();
    expect(pendingNovelty([], { role: "admin", platform: "web" })).toBeNull();
    expect(pendingNovelty([], { role: "coach", platform: "mobile" })).toBeNull();
  });

  it("una vez vista ya no sale, y una versión nueva vuelve a salir", () => {
    expect(pendingNovelty(["routine-blocks@1"], coach)).toBeNull();
    const v2 = fake({ version: 2, since: "2026-12-01" });
    expect(pendingNovelty(["routine-blocks@1"], coach, [NOVELTIES[0], v2])?.version).toBe(2);
  });

  it("con varias sin ver sale solo la más reciente", () => {
    const nueva = fake({ key: "otra", since: "2027-01-10" });
    expect(pendingNovelty([], coach, [NOVELTIES[0], nueva])?.key).toBe("otra");
    expect(noveltiesFor(coach, [NOVELTIES[0], nueva]).map((n) => n.key)).toEqual(["otra", "routine-blocks"]);
  });
});

describe("slides con condición", () => {
  const n = NOVELTIES[0];
  it("la de rutinas anteriores se omite si no hay rutinas sin bloque", () => {
    const con = visibleSlides(n, { hasUngroupedRoutines: true, blocksPageEnabled: true });
    const sin = visibleSlides(n, { hasUngroupedRoutines: false, blocksPageEnabled: true });
    expect(con).toHaveLength(4);
    expect(sin).toHaveLength(3);
    expect(sin.some((s) => s.when === "hasUngroupedRoutines")).toBe(false);
  });

  it("las condiciones salen de las rutinas de la persona", () => {
    expect(noveltyConditions(undefined)).toEqual({ hasUngroupedRoutines: false, blocksPageEnabled: true });
    expect(noveltyConditions([{ routineExercises: [{ blockId: "b1" }] }]).hasUngroupedRoutines).toBe(false);
    expect(noveltyConditions([{ routineExercises: [{ blockId: "b1" }, { blockId: null }] }]).hasUngroupedRoutines).toBe(true);
  });
});

describe("cuándo puede salir el popup", () => {
  const base = { pathname: "/", tourActive: false, modalOpen: false };
  it("sale en una página normal", () => expect(canShowNovelty(base)).toBe(true));
  it("no sale con la guía en curso ni con un diálogo abierto", () => {
    expect(canShowNovelty({ ...base, tourActive: true })).toBe(false);
    expect(canShowNovelty({ ...base, modalOpen: true })).toBe(false);
  });
  it("no sale donde hay un borrador abierto", () => {
    for (const p of ["/routines/new", "/routines/abc", "/sessions/s1"]) expect(isBuilderPath(p)).toBe(true);
    for (const p of ["/", "/routines", "/library", "/cycles/1"]) expect(isBuilderPath(p)).toBe(false);
  });
});
