---
type: brand
parent: "[[brand]]"
status: decided
tags: [brand, design-tokens]
created: 2026-09-23
updated: 2026-09-24
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

## Logo (agregado 2026-09-24)

Archivos en [`docs/brand/img/`](img/). Isotipo: un loop/flecha circular — coincide con el territorio visual que [[brand]] ya proponía (sección 14: "ciclos, círculos, loops"). Wordmark: "Cycles" en una grotesca bold redondeada (visualmente compatible con la familia de Bricolage Grotesque ya elegida para títulos).

| Archivo | Qué es |
|---|---|
| `logo_cycles.png` | Logo principal limpio (isotipo + wordmark horizontal), alta resolución, fondo blanco liso — el archivo "maestro" sin etiquetas de moodboard |
| `Cycles_01_logo_principal.png` | Igual composición, exportado desde el moodboard (con etiqueta y fondo texturado) |
| `Cycles_02_version_vertical.png` | Isotipo arriba, wordmark abajo |
| `Cycles_03_isotipo.png` | Solo el isotipo (loop circular), sin wordmark |
| `Cycles_04_logo_horizontal_variante.png` | Wordmark primero, isotipo a la derecha |
| `Cycles_05_wordmark_variante.png` | Wordmark con un punto de color como acento, sin isotipo |
| `Cycles_06_app_icon_favicon.png` | Isotipo sobre fondo oscuro con esquinas redondeadas — pensado para ícono de app/favicon |
| `Cycles_07_con_tagline.png` | Logo + "PERFORMANCE PLATFORM" debajo (coincide con el descriptor recomendado de [[brand]], sección 2) |
| `Cycles_08_version_dinamica.png` | Wordmark en itálica/inclinado, isotipo arriba |
| `Cycles_09_minimalista.png` | Solo wordmark + punto de acento, sin isotipo, la variante más reducida |

> **Actualización 2026-09-24 (desde otra sesión):** ya se midió el color exacto del logo y se registró como **color de marca primario**, en un [Design System](https://claude.ai/artifact/Smf7SUnx1VMBv3nhbGv1aR) aparte (sincronizado contra el código real, `main@5927717`):
>
> | Token | Valor | De dónde sale |
> |---|---|---|
> | `brand-blue` | `#3080fc` | El anillo del isotipo |
> | `brand-ink` | `#1f2228` | El wordmark "Cycles" |
>
> **Registrado, todavía NO aplicado al código** — la app sigue usando `--color-blue` (`#0066ee`, el de MyFitnessPal) hasta que se haga el rediseño. Ojo con `brand-blue`: da 3.74:1 de contraste contra blanco, insuficiente para texto chico (sirve para texto ≥24px o bold ≥19px, íconos y rellenos) — hace falta un tono más oscuro para texto chico cuando se aplique.
>
> Ese Design System documenta bastante más de lo que hay en este archivo: cada color/tipografía/spacing/radio ya usado en `apps/web` con su contraste calculado, componentes (`AppHeader`, `AuthCard`, `Button`, `Field`, `ListRow`, `ProgramGrid`, `UserMenu`, etc.), y una guía de voz/contenido (español latino neutro con "tú", sentence case, patrones de copy). Decidido el 2026-09-24: la regla es "tú", no voseo; el copy actual de la app todavía usa voseo y se reescribe al actualizar cada pantalla. También señala gaps reales: `color-gray-border` da menos de 3:1 como borde de control en ambos temas, y en modo oscuro el texto blanco sobre el botón primario (`#4d94ff`) da 3.0:1 (insuficiente para AA). Ninguno de los dos se corrigió todavía en el código.

## Fuera de esta decisión

- No se decidió nada sobre la **landing page** (marketing) — el usuario fue explícito en que eso se diseña después, por separado.
- No se decidieron radios de borde, espaciado, ni sistema de sombras — se mantienen los valores ya existentes en `auth.css` hasta que se pida cambiarlos.
- Los logos existen como archivos de imagen (sección de arriba), pero **todavía no se aplicaron** en ningún lado de la app (favicon, header, etc.) ni se eligió cuál variante usar en cada contexto.
