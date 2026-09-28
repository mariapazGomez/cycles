---
type: brand
parent: "[[identidad-visual]]"
status: decided
tags: [brand, design-tokens, reference]
created: 2026-09-27
updated: 2026-09-27
---

> Hoja de referencia rápida. Solo especificaciones visuales (color, tipografía, espaciado, formas) — sin copy/voz ni código de componentes, para usarla al crear cualquier elemento gráfico (banners, íconos, capturas ilustradas, slides, assets de marketing) sin perder el estilo actual de la app. Fuente: `apps/web/src/styles/*.css`, sincronizado contra el [Design System](https://claude.ai/artifact/Smf7SUnx1VMBv3nhbGv1aR) el 2026-09-25. Para decisiones y contexto histórico ver [[identidad-visual]]; para copy y voz ver ese mismo documento y el Design System.

## Idea de marca

Interfaz de herramienta de trabajo: blanco, tranquila, con azul de marca para estado/selección, grises tipo iOS, líneas finas en vez de sombras, y una grotesca con carácter reservada solo para títulos. *El rendimiento es un ciclo* — la idea de marca vive en el vocabulario y en la grilla, no en decoración.

## Color

**Marca** (medidos del logo):
| Token | Hex | Uso |
|---|---|---|
| `brand-blue` | `#3080fc` | Estado / selección: subrayado de nav activo, filas/celdas seleccionadas, líneas de gráficos, foco en la grilla. **3.74:1 sobre blanco — nunca para texto chico ni labels de botón.** |
| `brand-ink` | `#1f2228` | Único color de tinta: texto principal, títulos, rellenos oscuros (avatar, botones). 15.94:1 sobre blanco. |

**Azul accesible** (derivado, para texto/botones):
| Token | Hex | Uso |
|---|---|---|
| `color-blue` | `#1a66dd` | Botón primario, links, foco, acentos en texto chico. 4.5:1+ sobre blanco — usar este en vez de `brand-blue` para texto <24px o bold <19px. |
| `color-blue-hover` | `#155ccc` | Hover del botón primario. |
| `color-blue-tint` | `#eaf2ff` | Relleno pálido para filas/celdas resaltadas o seleccionadas. |

**Texto**:
| Token | Hex | Uso |
|---|---|---|
| `color-ink` | `#1f2228` | Texto principal, encabezados. |
| `color-ink-secondary` | `#5c6068` | Metadatos, texto de ayuda, nav inactivo. |
| `color-gray-mid` | `#8a8f98` | Marcas no esenciales: guion largo, la "o" del divisor, placeholders. |

**Superficies y bordes**:
| Token | Hex | Uso |
|---|---|---|
| `color-bg` | `#ffffff` | Fondo base: página, tarjetas, header, menús. |
| `color-gray-light` | `#f6f7f9` | Fondo hundido detrás de la auth card; hover de botones secundarios e ítems de menú. |
| `color-gray-border` | `#dfe2e7` | Líneas de 1px pasivas: tarjetas, separadores, celdas de grilla. |
| `color-control-border` | `#8a8f98` | Borde de controles interactivos (inputs, selects, botón secundario) — un paso más oscuro que la línea pasiva. |

**Estados de seguimiento** (tracking):
| Token | Hex | Uso |
|---|---|---|
| `color-ok-bg` / `color-ok-ink` | `#e9f5ec` / `#1e6b32` | Adherencia / éxito. |
| `color-warn-bg` / `color-warn-ink` | `#fff1e3` / `#9a4a00` | Necesita atención. |
| `color-warn-fill` | `#e08a2e` | Relleno sólido de warning (ej. serie "sesión saltada" en gráficos). |
| `color-pain-bg` / `color-pain-ink` | `#fdecec` / `#a3282c` | Dolor reportado. |

**Banners de auth** (par histórico, casi idéntico a ok/pain pero sin compartir variable — no introducir un tercer par nuevo):
| Token | Hex |
|---|---|
| `color-error-bg` / `color-error-border` / `color-error-ink` | `#fdecec` / `#f3b9b9` / `#a3282c` |
| `color-success-bg` / `color-success-border` / `color-success-ink` | `#eaf6ec` / `#b9dcc0` / `#1e6b32` |

**Reglas de color**: `brand-blue` = "esto está seleccionado / es el estado"; `color-blue` = "actuá acá" (botones, links) o acento de texto chico. Ninguno de los dos como relleno decorativo. Los encabezados siempre en `color-ink`, nunca en azul.

## Tipografía

Dos familias tipográficas más una reservada:

| Familia | Fuente | Uso |
|---|---|---|
| `display` | **Bricolage Grotesque** (Google Fonts, variable, pesos 400–800) | Solo títulos y cifras grandes. |
| `sans` | **Inter** (Google Fonts, 400/500/600/700) | Todo el resto: UI y texto corrido. |
| `mono` (reservada, aún no cargada) | **Victor Mono** | Reservada para columnas tabulares de sets/reps/peso. |

Jerarquía de tamaños (rem sobre raíz de 16px del navegador):

| Estilo | Familia | Tamaño | Peso | Uso |
|---|---|---|---|---|
| `text-page-title` | display | 2em | 700 | H1 de página. |
| `text-auth-title` | display | 1.6rem | 700 | Título de tarjeta de auth. |
| `text-logo` | display | 1.2rem | 700 | Wordmark tipeado en el header. |
| `text-section-title` | sans | 1.1rem | 700 | H2 dentro de una página. |
| `text-body` | sans | 1rem | 400 | Texto corrido por defecto. |
| `text-control` | sans | 0.95rem | 600 (labels de botón) / 400 (valores de input) | Botones e inputs. |
| `text-nav` | sans | 0.92rem | 600 | Links del header. |
| `text-meta` | sans | 0.9rem | 400 | Línea de metadatos bajo un título de página. |
| `text-label` | sans | 0.85rem | 600 | Labels de campos de formulario. |
| `text-small` | sans | 0.85rem | 400 | Banners, footer de auth, links "volver". |
| `text-caption` | sans | 0.82rem | 400 | Headers de fila/columna de grilla. |
| `text-fine` | sans | 0.8rem | 400 (700 en iniciales de avatar) | Texto de divisor, botones compactos de grilla. |
| `text-micro` | sans | 0.78rem | 400 | Línea secundaria en el menú de usuario (email). |
| `text-data` (reservada) | mono | 0.9rem | 400 | Números tabulares de entrenamiento. |

**Regla**: sentence case en todas partes (botones, títulos, nav) — nunca Title Case ni MAYÚSCULAS.

## Espaciado

Escala en px, sin nombre formal todavía — usar solo estos valores:

`2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32` px

Usos de referencia: gutter de página `24px` · padding de tarjeta de auth `32px` · separación entre secciones `32px` · stack de campos `16px` · gap entre campos lado a lado `12px` · gap entre botones agrupados `8px`.

## Radios de borde

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8px | Inputs, selects, banners, ítems de menú, celdas de grilla, paneles inline. |
| `radius-lg` | 12px | Tarjeta de auth, panel de menú de usuario. |
| `radius-pill` | 999px | Todos los botones (forma más reconocible de la UI). |
| `radius-round` | 50% | Avatar de usuario. |

## Sombra

Una sola sombra en todo el sistema — todo lo demás se separa con `color-gray-border`, nunca con elevación:

```
shadow-menu: 0 8px 24px -8px rgba(0, 0, 0, 0.18)
```
Uso: solo el panel flotante del menú de usuario.

## Layout

| Token | Valor | Uso |
|---|---|---|
| `layout-main-max` | 1120px | Ancho máximo del contenido principal. |
| `layout-form-max` | 420px | Formularios inline de crear/editar. |
| `layout-auth-max` | 400px | Tarjeta de auth. |
| `layout-list-max` | 480px | Lista de atletas. |
| `layout-panel-max` | 360px | Panel de asignación de la grilla. |
| `layout-grid-cell-min` | 140px | Ancho mínimo de celda de la grilla del plan. |
| `layout-avatar` | 36px | Diámetro del avatar. |

Breakpoint mobile: **640px** (padding y gaps más ajustados).

## Estados

- **Hover**: primario oscurece a `color-blue-hover`; secundario y ítems de menú rellenan `color-gray-light`; links de nav pasan de `color-ink-secondary` a `color-ink`.
- **Disabled**: `opacity: 0.6` + cursor `not-allowed`.
- **Foco**: contorno sólido de 2px en `color-blue`, offset 1px.
- **Nav activo**: texto `color-ink` con subrayado de 2px en `color-brand` (no azul sobre azul).
- **Motion**: ninguno. No hay transiciones definidas — no introducir sin que se pida.

## Logo e iconografía

- Archivo maestro: `docs/brand/img/logo_cycles.png` — anillo azul partido en dos arcos (el ciclo) junto al wordmark "Cycles" en grotesca redondeada pesada, casi negro.
- Usar solo sobre fondo blanco o `color-gray-light`. **Nunca** recolorear, estirar, recrear, ni ponerlo sobre superficie azul u oscura — es un PNG plano con fondo blanco, sin transparencia, sin versión oscura ni monocromática.
- No existe set de íconos. Las señales direccionales son glifos de texto (← → + —). Sin emoji en ningún lado.
- Otras variantes del logo (vertical, solo isotipo, con tagline, etc.) están en `docs/brand/img/` — ver [[identidad-visual]] para el listado completo; ninguna tiene aún versión transparente/SVG.

## Reglas de oro al crear un gráfico nuevo

1. Fondo blanco o `color-gray-light`; nunca degradados.
2. Separar con líneas de `color-gray-border`, no con sombras (la única excepción es `shadow-menu`).
3. Títulos en Bricolage Grotesque 700, todo lo demás en Inter.
4. `brand-blue` (#3080fc) solo para estado/selección/líneas de gráfico — nunca para texto chico ni botones: ahí va `color-blue` (#1a66dd).
5. Botones siempre con `radius-pill`; tarjetas y paneles con `radius-sm`/`radius-lg`.
6. Sentence case, sin emoji, sin Title Case.
7. Sin modo oscuro todavía — todo se diseña sobre fondo claro.
