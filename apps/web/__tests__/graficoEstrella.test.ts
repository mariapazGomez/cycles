import { buildStarLayout, lastDeltaLabel, lastSessionPhrase, type StarPoint } from "../src/lib/starChart";

// Spike CYC-243: la matemática del gráfico estrella (peso planificado vs. cargado).
const p = (label: string, planned: number | null, actual: number | null): StarPoint => ({ label, date: "2026-11-01", planned, actual });
const data = [p("Sem 1", 70, 70), p("Sem 2", 72.5, 72.5), p("Sem 3", 75, 72.5), p("Sem 4", 77.5, null)];

describe("gráfico estrella", () => {
  it("dibuja una marca por sesión dentro del ancho y deja los huecos sin marca", () => {
    const l = buildStarLayout(data, 480, 240);
    expect(l.points).toHaveLength(4);
    expect(l.points[3].actualY).toBeNull();
    expect(l.points[3].plannedY).not.toBeNull();
    expect(l.points.every((pt) => pt.x >= l.margin.left && pt.x <= 480 - l.margin.right)).toBe(true);
    // más peso = más arriba
    expect(l.y(75)).toBeLessThan(l.y(70));
  });

  it("une las sesiones con trazo, y la banda solo existe donde hay plan y real", () => {
    const l = buildStarLayout(data, 480, 240);
    expect(l.plannedPath.startsWith("M")).toBe(true);
    expect(l.actualPath.startsWith("M")).toBe(true);
    expect(l.bandPath.length).toBeGreaterThan(0);
    expect(buildStarLayout([p("a", 70, null), p("b", 72, null)], 480, 240).bandPath).toBe("");
  });

  it("no se rompe sin datos ni con un ancho diminuto", () => {
    expect(() => buildStarLayout([], 480, 240)).not.toThrow();
    const l = buildStarLayout(data, 100, 200);
    expect(l.width).toBeGreaterThanOrEqual(240);
  });

  it("la frase y la etiqueta usan la última sesión con plan y real", () => {
    expect(lastSessionPhrase(data)).toBe("Cargó 2,5 kg menos que el plan en la última sesión.");
    expect(lastDeltaLabel(data)).toEqual({ text: "−2,5 kg", tone: "below" });
    expect(lastDeltaLabel([p("a", 70, 72.5)])).toEqual({ text: "+2,5 kg", tone: "above" });
    expect(lastDeltaLabel([p("a", 70, 70)])).toEqual({ text: "= plan", tone: "equal" });
    expect(lastSessionPhrase([p("a", null, null)])).toMatch(/Todavía no hay/);
  });
});
