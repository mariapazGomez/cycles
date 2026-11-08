import { GLYPHS, GLYPH_VIEWBOX } from "../../assets/pearl/glyphs";
import { PEARL_COLORS, type PearlKind } from "../../lib/eventPearls";

// Perla de color con el pictograma relleno en blanco, como en la app (CYC-253). El pictograma
// ocupa el 58 % del diámetro. Decorativa para el lector de pantalla: el nombre, la hora y la
// intensidad van en el texto de al lado.
const GLYPH_RATIO = 0.58;

export function Pearl({ kind, size = 19 }: { kind: PearlKind; size?: number }) {
  const glyph = size * GLYPH_RATIO;
  const offset = (size - glyph) / 2;
  const scale = glyph / GLYPH_VIEWBOX;
  return (
    <svg className="ev-pearl" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={PEARL_COLORS[kind.family]} />
      <path d={GLYPHS[kind.glyph]} fill="#ffffff" transform={`translate(${offset} ${offset}) scale(${scale})`} />
    </svg>
  );
}
