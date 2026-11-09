import type { SessionWorkBlock } from "@cycles/shared";
import { BLOCK_TYPE_COLOR, BLOCK_TYPE_LABEL, blockColor, blockSummary, groupByBlock, sessionSummary } from "../src/lib/workBlocks";

// CYC-268: la sesión se ve por bloques; lo que no tiene bloque se ve como la lista de siempre.
const block = (id: string, orderIndex: number, over: Partial<SessionWorkBlock> = {}): SessionWorkBlock => ({
  id, sessionId: "s", name: id, type: "strength", color: null, orderIndex, note: null, ...over,
});
const ex = (id: string, orderIndex: number, blockId: string | null, targetSets = 3) => ({ id, orderIndex, blockId, targetSets });

describe("bloques de la sesión en la web", () => {
  it("agrupa por bloque en el orden de los bloques y deja los sueltos al final", () => {
    const groups = groupByBlock([block("b2", 2), block("b1", 1)], [ex("e3", 3, null), ex("e2", 2, "b2"), ex("e1", 1, "b1"), ex("e0", 0, "b1")]);
    expect(groups.map((g) => [g.block?.id ?? null, g.exercises.map((e) => e.id)])).toEqual([
      ["b1", ["e0", "e1"]],
      ["b2", ["e2"]],
      [null, ["e3"]],
    ]);
  });

  it("una sesión anterior (sin bloques) es un solo grupo sin encabezado", () => {
    const groups = groupByBlock(undefined, [ex("a", 1, null), ex("b", 2, null)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].block).toBeNull();
    expect(sessionSummary(groups)).toBe("2 ejercicios, 6 series");
  });

  it("un ejercicio que apunta a un bloque que ya no existe no se pierde", () => {
    const groups = groupByBlock([block("b1", 1)], [ex("e1", 1, "borrado")]);
    expect(groups.map((g) => g.exercises.map((e) => e.id))).toEqual([[], ["e1"]]);
  });

  it("un bloque vacío se muestra igual", () => {
    expect(groupByBlock([block("b1", 1)], [])).toHaveLength(1);
  });

  it("resume con singular y plural", () => {
    expect(blockSummary([ex("a", 1, null, 1)])).toBe("1 ejercicio, 1 serie");
    const groups = groupByBlock([block("b1", 1), block("b2", 2)], [ex("a", 1, "b1", 2), ex("b", 2, "b2", 4)]);
    expect(sessionSummary(groups)).toBe("2 bloques, 2 ejercicios, 6 series");
  });

  it("cada tipo tiene nombre y color propio, y ninguno es azul", () => {
    const types = Object.keys(BLOCK_TYPE_LABEL);
    expect(new Set(Object.values(BLOCK_TYPE_COLOR)).size).toBe(types.length);
    for (const color of Object.values(BLOCK_TYPE_COLOR)) {
      const [r, , b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
      expect(r < 0x80 && b > 0xb0).toBe(false); // el azul de la app tiene poco rojo y mucho azul
    }
  });

  it("el personalizado usa su color; si viene mal formado, vuelve al neutro", () => {
    expect(blockColor({ type: "custom", color: "#8a63d2" })).toBe("#8a63d2");
    expect(blockColor({ type: "custom", color: "rojo" })).toBe(BLOCK_TYPE_COLOR.custom);
    expect(blockColor({ type: "warmup", color: "#000000" })).toBe(BLOCK_TYPE_COLOR.warmup);
  });
});
