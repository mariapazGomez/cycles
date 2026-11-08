// Escala de las vistas con el tamaño de letra del sistema y el ancho de pantalla (CYC-259,
// docs/diseno/vistas-app). El texto escala sin tope propio (el tope general es ×2);
// las perlas y los íconos escalan con la letra pero se detienen en ×1,35, para que no
// devoren la pantalla; los espacios escalan con la letra.
export const FONT_SCALE_MAX = 2;
export const ICON_SCALE_MAX = 1.35;
// A partir de aquí (letra ×1,3 o ancho menor a 340 pt) las vistas se reorganizan.
export const BIG_FONT_SCALE = 1.3;
export const NARROW_WIDTH = 340;
// Zona táctil mínima.
export const MIN_TOUCH = 44;

export interface ViewScale {
  /** Factor de letra del sistema, acotado a 0,85–2. */
  font: number;
  /** Factor para perlas e íconos: sigue a la letra pero se detiene en ×1,35 (y no baja de 1). */
  icon: number;
  /** Letra grande o pantalla angosta: reorganizar (una perla por día en el mes, etc.). */
  big: boolean;
  width: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function viewScale(fontScale: number, width: number): ViewScale {
  const font = clamp(Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1, 0.85, FONT_SCALE_MAX);
  return {
    font,
    icon: clamp(font, 1, ICON_SCALE_MAX),
    big: font >= BIG_FONT_SCALE || width < NARROW_WIDTH,
    width,
  };
}

// Tamaño de una perla o ícono a la escala actual, redondeado.
export const scaledIcon = (base: number, scale: ViewScale) => Math.round(base * scale.icon);

// Espacio (margen, relleno) que respira con la letra.
export const scaledSpace = (base: number, scale: ViewScale) => Math.round(base * scale.font);

// Alto mínimo de una zona táctil: nunca menos de 44 pt y crece con la letra hasta 56 pt.
export const touchHeight = (scale: ViewScale) => clamp(Math.round(MIN_TOUCH * scale.font), MIN_TOUCH, 56);
