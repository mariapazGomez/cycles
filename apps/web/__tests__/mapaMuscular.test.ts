import type { Exercise } from "@cycles/shared";
import { groupCounts, groupsLabel, onlySecondary, parseZones, toggleGroup, visibleExercises } from "../src/lib/exercises";

// CYC-231: filtro de Ejercicios por zona muscular.
const ex = (id: string, name: string, muscleGroup: string, secondary: string[] = [], createdBy: string | null = "c1") =>
  ({ id, name, muscleGroup, secondaryMuscleGroups: secondary, createdBy, equipment: [] }) as unknown as Exercise;

const all = [
  ex("1", "Press de banca", "chest", ["arms", "shoulders"]),
  ex("2", "Remo con barra", "back", ["arms"]),
  ex("3", "Plancha", "core"),
  ex("4", "Aperturas", "chest"),
  ex("5", "Sentadilla", "legs", ["glutes", "core"]),
  ex("6", "Trote", "cardio"),
  ex("7", "Prensa catálogo", "legs", [], null),
];

describe("filtro por zonas", () => {
  it("sin zonas deja todos los de la pestaña, en orden alfabético", () => {
    expect(visibleExercises(all, "c1", "mine", [], "").map((e) => e.name)).toEqual([
      "Aperturas", "Plancha", "Press de banca", "Remo con barra", "Sentadilla", "Trote",
    ]);
  });

  it("con varias zonas basta con trabajar alguna (principal o secundaria)", () => {
    const names = visibleExercises(all, "c1", "mine", ["chest", "core"], "").map((e) => e.name);
    expect(names).toEqual(["Aperturas", "Plancha", "Press de banca", "Sentadilla"]);
  });

  it("los que la trabajan como principal van primero y los secundarios después", () => {
    const names = visibleExercises(all, "c1", "mine", ["arms"], "").map((e) => e.name);
    expect(names).toEqual(["Press de banca", "Remo con barra"]); // arms es secundaria en ambos
    const core = visibleExercises(all, "c1", "mine", ["core"], "");
    expect(core.map((e) => e.name)).toEqual(["Plancha", "Sentadilla"]);
    expect(core.map((e) => onlySecondary(e, ["core"]))).toEqual([false, true]);
  });

  it("combina con el buscador y con la pestaña", () => {
    expect(visibleExercises(all, "c1", "mine", ["chest"], "pres").map((e) => e.name)).toEqual(["Press de banca"]);
    expect(visibleExercises(all, "c1", "catalog", ["legs"], "").map((e) => e.name)).toEqual(["Prensa catálogo"]);
    expect(visibleExercises(all, "c1", "mine", ["back"], "prensa")).toEqual([]);
  });

  it("cardio y otro se pueden combinar con zonas del mapa", () => {
    expect(visibleExercises(all, "c1", "mine", ["cardio", "back"], "").map((e) => e.name)).toEqual(["Remo con barra", "Trote"]);
  });

  it("cuenta por grupo según la pestaña y la búsqueda", () => {
    const counts = groupCounts(all, "c1", "mine", "");
    expect(counts.chest).toBe(2);
    expect(counts.arms).toBe(2);
    expect(counts.core).toBe(2);
    expect(counts.glutes).toBe(1);
    expect(counts.other).toBe(0);
    expect(groupCounts(all, "c1", "mine", "plancha").chest).toBe(0);
    expect(groupCounts(all, "c1", "catalog", "").legs).toBe(1);
  });
});

describe("zonas en la dirección", () => {
  it("lee solo grupos válidos, sin repetir y en el orden de siempre", () => {
    expect(parseZones("core,chest,xx,chest")).toEqual(["chest", "core"]);
    expect(parseZones(null)).toEqual([]);
    expect(parseZones("")).toEqual([]);
  });

  it("suma y quita una zona sin tocar las demás", () => {
    expect(toggleGroup(["chest"], "core")).toEqual(["chest", "core"]);
    expect(toggleGroup(["chest", "core"], "chest")).toEqual(["core"]);
  });

  it("arma el texto «Pecho o Core»", () => {
    expect(groupsLabel(["chest", "core"])).toBe("Pecho o Core");
  });
});
