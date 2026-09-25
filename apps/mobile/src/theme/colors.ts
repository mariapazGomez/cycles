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
