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
  return {
    heroHeight: clamp(150, height * 0.3, 300),
    heroCompactHeight: 96,
    ringSize: clamp(54, height * 0.1, 104),
    ringCompactSize: 38,
    wordSize: clamp(22, height * 0.036, 34),
    titleSize: clamp(22, height * 0.037, 32),
    controlHeight: clamp(52, height * 0.07, 68),
    buttonHeight: clamp(52, height * 0.069, 64),
    gap: clamp(8, height * 0.018, 16),
    sheetPadding: clamp(16, width * 0.054, 28),
    sheetMaxWidth: 520,
  };
}
