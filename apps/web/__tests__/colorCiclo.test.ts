import { canPickColor, colorOf, colorUser } from "../src/lib/teamColors";

const cycle = (id: string, color?: string | null, status = "active") => ({ id, name: id, status, ...(color === undefined ? {} : { color }) });

describe("color de la barra del ciclo", () => {
  it("sin color guardado, o con uno que no está en la lista, es azul", () => {
    expect(colorOf(cycle("a", null)).value).toBe("#1b66dc");
    expect(colorOf(cycle("a", "rojo")).key).toBe("blue");
    expect(colorOf(cycle("a", "teal")).name).toBe("Turquesa");
  });

  it("el selector sale con dos o más ciclos sin archivar", () => {
    const one = cycle("a", null);
    expect(canPickColor(one, [one])).toBe(false);
    expect(canPickColor(one, [one, cycle("b", null, "archived")])).toBe(false);
    expect(canPickColor(one, [one, cycle("b", "violet", "completed")])).toBe(true);
  });

  it("no sale si la API todavía no devuelve el color: no se podría guardar", () => {
    const old = cycle("a");
    expect(canPickColor(old, [old, cycle("b")])).toBe(false);
  });

  it("dice qué otro ciclo usa un color", () => {
    const cycles = [cycle("a", null), cycle("b", "violet"), cycle("c", "teal", "archived")];
    expect(colorUser(cycles, "blue", "b")).toBe("a");
    expect(colorUser(cycles, "violet", "b")).toBeNull();
    expect(colorUser(cycles, "teal", "b")).toBeNull();
  });
});
