---
type: brand
parent: "[[brand]]"
status: decided
tags: [brand, design-tokens]
created: 2026-09-23
---

> Hijo de [[brand]]. A diferencia de [[investigacion-competitiva]] (puramente informativo), este documento **sí contiene decisiones tomadas** por el usuario el 2026-09-23, a partir de esa investigación.

# Identidad visual — decisiones

## Tipografía

Punto de partida: al usuario le gustó la tipografía de [Everfit](investigacion-competitiva.md#everfit).

- **Texto general / UI:** **Inter** — es la misma que usa Everfit para body y UI, gratuita (Google Fonts).
- **Títulos y números grandes:** **Bricolage Grotesque** (peso Bold/ExtraBold), en reemplazo de la fuente original de Everfit.

  > ⚠️ La fuente que usa Everfit para sus títulos y cifras destacadas ("+82%", "12x") es **`Everfit Denim AllOn`** — una tipografía con nombre de marca propio, no disponible públicamente. No se puede usar. Bricolage Grotesque se eligió como reemplazo por ser una grotesca bold con carácter propio (no un genérico tipo Arial Bold), gratuita, con pesos hasta Black.
- **Datos/números en contexto tabular (opcional):** **Victor Mono** — esta sí es la fuente real que usa Everfit para algunos elementos, es open source. Disponible para usar en tablas de series/reps/peso si en algún momento se quiere un tratamiento "monoespaciado" para alinear columnas de números.

## Color

Punto de partida: minimalista, azul estilo MyFitnessPal, fondo blanco, grises, texto negro.

Azul medido directamente de myfitnesspal.com (no de memoria — capturado y leído de sus estilos):

| Token | Valor | Uso |
|---|---|---|
| Azul primario | `#0066ee` | Botones primarios, links, focus, acentos |
| Fondo | `#ffffff` | Fondo base |
| Texto principal | `rgba(0,0,0,0.87)` | MyFitnessPal no usa negro puro — 87% de opacidad, una convención (viene de Material Design) para que el texto se sienta menos duro que `#000000` puro mantenido la misma decisión de "texto negro" |
| Texto secundario | `#6c6c70` | Subtítulos, ayuda, texto de menor énfasis |
| Gris claro (bordes/fondos sutiles) | `#f6f6f8` / `#bcbcc0` | Bordes, fondos de tarjetas/inputs — son literalmente la escala de grises de iOS, que es lo que usa MyFitnessPal |
| Gris medio (íconos/texto deshabilitado) | `#8e8e93` | — |

## Dónde se aplicó

`apps/web/src/styles/global.css` y `apps/web/src/styles/auth.css` — son los estilos compartidos que ya existían (usados por todas las pantallas de auth + `AthletesPanel`). Al aplicarlo ahí, cualquier pantalla nueva que se construya (ciclos, sesiones — ver [[PRD-FrontendPlanificacion]]) hereda esto automáticamente sin tener que repetirlo.

## Fuera de esta decisión

- No se decidió nada sobre la **landing page** (marketing) — el usuario fue explícito en que eso se diseña después, por separado.
- No se decidieron radios de borde, espaciado, ni sistema de sombras — se mantienen los valores ya existentes en `auth.css` hasta que se pida cambiarlos.
- No se decidió un logo ni iconografía.
