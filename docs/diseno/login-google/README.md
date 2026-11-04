---
type: design
parent: "[[login-social-ios]]"
status: proposed
tags: [diseno, auth, ios, google]
created: 2026-11-04
updated: 2026-11-04
---

# Botón «Continuar con Google» con el logo oficial (CYC-232)

> Pedido de App móvil (CYC-220): el botón de Google de la pantalla de acceso solo tiene texto y le falta la «G» oficial. Este diseño lo alinea con las pautas de marca de Google y con el botón «Continuar con Apple». **Contrastado con `origin/main` d3586ac.** Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta en [`propuestas.html`](propuestas.html); asset en [`google-g.svg`](google-g.svg).

## Verificado contra origin/main d3586ac

| Archivo | Qué hay hoy |
|---|---|
| `apps/mobile/src/screens/LoginScreen.tsx` | Debajo de la hoja del título: botón de Apple (`AppleButton`, negro, tipo CONTINUE, radio = alto/2), luego el de Google, luego «o» y los campos. El de Google es **solo texto**: blanco, borde `controlBorder` de 1 px, radio 999, `fontSize 17`, `fontWeight 600`, separado 8 px del de Apple. |
| `components/login/layout.ts` (`loginMetrics`) | Altura de los controles = `clamp(46, 6 % del alto, 54)`: en un iPhone 15 Pro, 51 px. Apple, campos y botón comparten esa altura. |
| `services/googleSignIn.ts` | Flujo con `react-native-app-auth`; el botón solo existe en iOS y si la compilación trae el ID de cliente. |
| `apps/mobile/package.json` | Ya trae `react-native-svg`: el logo se dibuja como SVG, sin imagen. |
| `apps/web/src/components/GoogleButton.tsx` | La web ya dibuja la «G» de cuatro colores (viewBox 18 × 18) con 16 px. De ahí sale el asset. |

## Qué dicen las pautas de Google (developers.google.com/identity/branding-guidelines)

| Tema | Pauta |
|---|---|
| Tema claro | Relleno `#FFFFFF`, **borde `#747775` de 1 px hacia adentro**, texto `#1F1F1F`. |
| Logo | La «G» **estándar a color sobre fondo blanco**. No se puede cambiar su color ni su proporción, ni usarla sola sin el botón y el texto, ni en versión monocroma, ni crear una propia. |
| Texto | «Sign in with Google», «Sign up with Google» o «Continue with Google»; **se puede localizar**. En español: **«Continuar con Google»**. No usar solo la palabra «Google». |
| Tipografía | Google Sans Medium, 14/20 (a escala del botón). |
| Espacios (iOS) | **16 px** antes de la «G», **12 px** entre la «G» y el texto, **16 px** después del texto. |
| Forma | Se muestran la forma **rectangular** y la **píldora**; el radio no está fijado. |
| Junto a otras opciones | El botón de Google debe verse **al menos tan prominente** que las demás (por ejemplo, Apple): tamaño y peso visual parecidos. |
| Archivo oficial | Paquete de íconos aprobados (`signin-assets.zip`, PNG y SVG) en la misma página. |

**Lo que las pautas no fijan** (y que decide este diseño): altura, radio de esquinas, tamaño exacto de la «G» y estados al presionar.

## Diseño

Mismo ancho, misma altura y mismo radio que el botón de Apple; Apple arriba y Google debajo, separados 8 px, como hoy.

| Elemento | Valor | Por qué |
|---|---|---|
| Alto | `controlHeight` (46 a 54, hoy 51) | Igual que Apple, campos y «Entrar». Destino táctil ≥ 44 px. |
| Forma | Píldora, radio = alto / 2 | Igual que Apple y el resto del acceso; las pautas la permiten. |
| Relleno | `#FFFFFF` | Pauta de Google. |
| Borde | 1 px `#747775` (hacia adentro) | Pauta de Google. Reemplaza `#8a8f98` solo en este botón. |
| Texto | «Continuar con Google», `#1F1F1F`, **17 px, peso medio**, una línea | Escala de 14/20 al alto del control (×1,25) y mismo tamaño que el texto de Apple. |
| «G» | Asset oficial a color, **22 px** (20 / 22 / 24 según el alto: 46–48 / 49–52 / 53–54) | Escala proporcional de la «G»; nunca se estira. |
| Espacios | Mínimo 20 px a cada lado (16 × 1,25) y **12 px** entre la «G» y el texto | Pauta de iOS escalada; el grupo «G + texto» va **centrado**, como en el botón de Apple. |
| Separación con Apple | 8 px | Dentro de un grupo, 8 (escala del acceso). |

### Estados

| Estado | Qué se ve |
|---|---|
| Normal | Como arriba. |
| Presionado | Sigue el efecto de `PressableScale` de la app y un velo de `#1F1F1F` al 8 % sobre el relleno. |
| Procesando | Los dos botones de redes bajan al 60 % de opacidad y no responden (igual que hoy con `dimmed`). |
| Error | El aviso rojo ya existente sobre los botones («No pudimos iniciar sesión con Google.»). No cambia el botón. |

### Fuente

La pauta pide Google Sans Medium. La app usa la tipografía del sistema (SF). **Propuesta: SF en peso medio** (500) en el botón, a 17 px; es una desviación menor y evita empaquetar una fuente. Si se quiere cumplir al pie de la letra, hay que sumar Google Sans a la app (revisar su licencia). Es la pregunta 1.

### Accesibilidad

- `accessibilityRole="button"` y `accessibilityLabel="Continuar con Google"`; la «G» es decorativa (`accessibilityElementsHidden` / `importantForAccessibility="no"`), el texto no se repite.
- Orden de lectura: Apple, Google, correo, contraseña, Entrar.
- Contraste: texto `#1F1F1F` sobre blanco 16,5:1; borde `#747775` sobre blanco 4,6:1 (mínimo para no texto 3:1).
- Tamaño de letra del sistema: el alto del botón es fijo, así que el texto usa `maxFontSizeMultiplier` de 1,15, una sola línea y `adjustsFontSizeToFit` hasta 85 %; el botón de Apple ya escala solo.
- Sin animación propia; el destello de la hoja de Apple (`sheen`) **no** se aplica al de Google.
- Modo claro únicamente (el oscuro está desactivado). Google tiene una variante oscura que se diseñará con esa fase.

## Asset listo para usar

[`google-g.svg`](google-g.svg): la «G» de cuatro colores (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`), viewBox 18 × 18, la misma geometría que ya usa la web. Para la app, con `react-native-svg` (ya instalado):

```tsx
import Svg, { Path } from 'react-native-svg';

// «G» oficial de Google, a color. No cambiar colores ni proporciones (pautas de marca).
export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z" />
      <Path fill="#FBBC05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.94a9 9 0 0 0 0 8.06l3.01-2.33Z" />
      <Path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z" />
    </Svg>
  );
}
```

**Antes de enviar a la App Store**, comparar este SVG con el del paquete oficial (`signin-assets.zip`, en la página de pautas). Si difiere en geometría, se reemplaza por el oficial; no se redibuja.

## Qué cambia en `LoginScreen.tsx` (para App móvil)

- `googleWrap`: `borderColor` a `#747775`.
- `googleButton`: fila centrada con `GoogleG`, 12 px de separación y el texto.
- `googleText`: `color #1F1F1F`, `fontSize 17`, `fontWeight 500`, sin cambiar el texto.
- Sin tocar el flujo ni el botón de Apple.

## Hallazgo aparte

La **web** tiene el mismo botón (`GoogleButton.tsx`) con la «G» de 16 px sobre un botón secundario gris. No cumple las pautas (relleno blanco, borde `#747775`, «G» más grande). No se cambia aquí; queda para una alineación posterior.

## Preguntas para la usuaria

1. ¿El texto del botón va en la **tipografía del sistema** en peso medio (recomendado) o empaquetamos Google Sans?
2. ¿Apple arriba y Google debajo, como hoy? (Las pautas piden que Google sea tan prominente como Apple: mismo ancho, alto y radio.)
3. ¿Alineamos después el botón de Google de la web con las mismas pautas?
