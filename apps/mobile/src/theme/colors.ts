// Espejo de los tokens de apps/web/src/styles/global.css (paleta del
// rediseño 2026-09-25, colores del logo). React Native no tiene custom
// properties de CSS, así que este objeto es la fuente de verdad para no
// repetir hex sueltos en cada pantalla. Si global.css cambia, actualizar acá.
export const colors = {
  brand: '#3080fc',
  blue: '#1a66dd',
  blueHover: '#155ccc',
  blueTint: '#eaf2ff',
  bg: '#ffffff',
  onBlue: '#ffffff',
  ink: '#1f2228',
  inkSecondary: '#5c6068',
  grayLight: '#f6f7f9',
  // Solo mobile: fondo de la app, para que las tarjetas blancas se separen por
  // superficie (excepción a "líneas finas en vez de sombras" de la web).
  bgApp: '#f3f5f8',
  inkTrack: '#3a3f48',
  inkMuted: '#bfc4cc',
  grayDot: '#d7dce3',
  grayBorder: '#dfe2e7',
  controlBorder: '#8a8f98',
  grayMid: '#8a8f98',
  okBg: '#e9f5ec',
  okInk: '#1e6b32',
  warnBg: '#fff1e3',
  warnInk: '#9a4a00',
  warnFill: '#e08a2e',
  painBg: '#fdecec',
  painInk: '#a3282c',
} as const;

// Un color por grupo muscular, en este orden fijo (el color sigue al grupo,
// no a su tamaño). Paleta categórica validada con el script de la guía de
// gráficos: pasa luminosidad, saturación y daltonismo; tres tonos quedan por
// debajo de 3:1 sobre blanco, por eso el Resumen siempre muestra leyenda,
// porcentajes y tabla.
export const muscleColors = {
  legs: '#3080fc',
  back: '#eb6834',
  chest: '#1baf7a',
  shoulders: '#eda100',
  glutes: '#e87ba4',
  arms: '#008300',
  core: '#4a3aa7',
} as const;

// Rampa secuencial de un solo azul (claro a oscuro) del mapa muscular.
export const intensityRamp = ['#cfe0fd', '#8fb8fb', '#3080fc', '#1a55c2', '#0d2f78'] as const;
export const noLoadFill = '#dfe4ec';
export const bodyBase = '#e7ebf1';
export const bodyOutline = '#c9ced6';

