// Control de series (− número +) de una fila de rutina. Lo usan el cajón (clases bd-)
// y el editor de la Biblioteca (clases rt-); `name` agrega el ejercicio a las etiquetas.
import { parseNumber } from "../../lib/routineStats";

const CLASSES = {
  rt: { label: "rt-label", step: "rt-step" },
  bd: { label: "bd-lbl", step: "bd-step" },
} as const;

export function SeriesStepper({
  value,
  onChange,
  prefix,
  name,
}: {
  value: string;
  onChange: (next: string) => void;
  prefix: keyof typeof CLASSES;
  name?: string;
}) {
  const of = name ? ` de ${name}` : "";
  const sumOf = name ? ` a ${name}` : "";
  const c = CLASSES[prefix];
  return (
    <div>
      <span className={c.label}>Series</span>
      <div className={c.step}>
        <button type="button" aria-label={`Quitar una serie${of}`} onClick={() => onChange(String(Math.max(1, (parseNumber(value) || 2) - 1)))}>
          −
        </button>
        <output aria-label={`Series${of}`}>{value || "–"}</output>
        <button type="button" aria-label={`Sumar una serie${sumOf}`} onClick={() => onChange(String((parseNumber(value) || 0) + 1))}>
          +
        </button>
      </div>
    </div>
  );
}
