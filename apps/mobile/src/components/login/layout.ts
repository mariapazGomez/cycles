// Medidas de la pantalla de entrada: se calculan con el alto y el ancho de la
// ventana, cada una con un mínimo y un máximo, para que se compacten en los
// teléfonos chicos y respiren en los grandes.
export const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

export interface LoginMetrics {
  heroHeight: number;
  heroCompactHeight: number;
  ringSize: number;
  ringCompactSize: number;
  wordSize: number;
  titleSize: number;
  controlHeight: number;
  buttonHeight: number;
  gap: number;
  sheetPadding: number;
  // El formulario no se estira en pantallas anchas (tabletas, horizontal).
  sheetMaxWidth: number;
}

export function loginMetrics(width: number, height: number): LoginMetrics {
  // Apple, campos y botón comparten la misma altura: el ritmo del formulario es
  // regular y ningún control pesa más que otro (guía de Apple: 44 a 56).
  const control = clamp(46, height * 0.06, 54);
  return {
    heroHeight: clamp(150, height * 0.28, 250),
    heroCompactHeight: 96,
    ringSize: clamp(50, height * 0.085, 84),
    ringCompactSize: 38,
    wordSize: clamp(22, height * 0.032, 30),
    titleSize: clamp(24, height * 0.032, 28),
    controlHeight: control,
    buttonHeight: control,
    // Dentro de un grupo, 8; entre grupos, 16 (escala de 4).
    gap: 16,
    sheetPadding: clamp(20, width * 0.056, 28),
    sheetMaxWidth: 480,
  };
}
