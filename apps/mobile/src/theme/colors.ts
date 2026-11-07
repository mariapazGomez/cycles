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

// ─── Reglas de color de las vistas (CYC-258, docs/diseno/vistas-app) ───────────────────
// 1. El AZUL es solo de la app: botones, selección, anillo del ciclo, enlaces y las líneas
//    de los gráficos. Ninguna perla (ícono de actividad) va en azul.
// 2. La FUERZA DEL COACH va en VERDE: «verde con pesas» siempre es una sesión del coach.
// 3. Lo que agrega el ATLETA usa otros colores: deportes (y pesas) en NARANJA, descanso y
//    yoga en VIOLETA, partido o competencia en TINTA, viaje y «otro» en GRIS, y la lesión en
//    ROJO (color de estado, con texto siempre al lado).
// 4. El color nunca va solo: toda perla lleva texto con su nombre (diseño de accesibilidad).
// 5. Sin valores sueltos: los componentes de las vistas importan de aquí, no escriben hex.
export const pearlColors = {
  green: '#2f9e5f',
  orange: '#f08a24',
  violet: '#8a63d2',
  ink: '#1f2228',
  gray: '#8d95a2',
  red: '#d1494d',
} as const;

export type PearlFamily = keyof typeof pearlColors;

// Superficies y sombra de las vistas nuevas (Hoy, Calendario, Resumen). El fondo azulado
// y la sombra azulada reemplazan a `bgApp` y `cardShadow` pantalla por pantalla.
export const viewColors = {
  bg: '#eef3fc',
  track: '#dbe6fb',
  pearlGlyph: '#ffffff',
  danger: '#a3282c',
  surfaceMuted: '#f1f3f6',
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

