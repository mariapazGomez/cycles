import { BadRequestException } from "@nestjs/common";
import { CUSTOM_BLOCK_COLORS, MAX_BLOCKS, MAX_STRUCTURE_EXERCISES, cleanBlocks, type BlockInputLike } from "./work-blocks";

const block = (over: Partial<BlockInputLike> = {}): BlockInputLike => ({ type: "strength", name: "Fuerza", exercises: [{}], ...over });
const message = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return (e as BadRequestException).message;
  }
  throw new Error("no lanzó");
};

describe("cleanBlocks (CYC-275)", () => {
  it("limpia el nombre, la nota y el color y conserva el id", () => {
    const [b] = cleanBlocks([block({ id: "b1", type: "custom", name: "  Core  ", color: "#8A63D2", note: "  sin prisa  " })], 0);
    expect(b).toEqual({ id: "b1", type: "custom", name: "Core", color: "#8a63d2", note: "sin prisa" });
  });

  it("un bloque sin color ni nota los deja en null", () => {
    expect(cleanBlocks([block({ note: "   " })], 0)[0]).toMatchObject({ color: null, note: null });
  });

  it("rechaza la superserie (reservada hasta CYC-108)", () => {
    expect(message(() => cleanBlocks([block({ type: "superset" })], 0))).toContain("superseries");
  });

  it("el color solo vale en el personalizado y debe ser de la lista", () => {
    expect(message(() => cleanBlocks([block({ color: "#8a63d2" })], 0))).toContain("personalizado");
    expect(message(() => cleanBlocks([block({ type: "custom", color: "#1a66dd" })], 0))).toContain("colores");
    for (const color of CUSTOM_BLOCK_COLORS) expect(() => cleanBlocks([block({ type: "custom", color })], 0)).not.toThrow();
  });

  it("ninguna muestra es azul", () => {
    for (const color of CUSTOM_BLOCK_COLORS) {
      const [r, , b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
      expect(r < 0x80 && b > 0xb0).toBe(false);
    }
  });

  it("exige nombre y limita su largo", () => {
    expect(message(() => cleanBlocks([block({ name: "   " })], 0))).toContain("nombre");
    expect(message(() => cleanBlocks([block({ name: "x".repeat(41) })], 0))).toContain("40");
    expect(() => cleanBlocks([block({ name: "x".repeat(40) })], 0)).not.toThrow();
  });

  it("limita bloques y ejercicios, y no admite ids repetidos", () => {
    expect(message(() => cleanBlocks(Array.from({ length: MAX_BLOCKS + 1 }, () => block({ exercises: [] })), 0))).toContain(String(MAX_BLOCKS));
    expect(() => cleanBlocks(Array.from({ length: MAX_BLOCKS }, () => block({ exercises: [] })), 0)).not.toThrow();
    expect(message(() => cleanBlocks([block({ exercises: new Array(MAX_STRUCTURE_EXERCISES).fill({}) })], 1))).toContain(String(MAX_STRUCTURE_EXERCISES));
    expect(message(() => cleanBlocks([block({ id: "x" }), block({ id: "x" })], 0))).toContain("repetido");
  });

  it("un bloque vacío es válido", () => {
    expect(cleanBlocks([block({ exercises: [] })], 0)).toHaveLength(1);
  });
});
