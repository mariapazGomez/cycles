---
type: design
parent: "[[ciclo-en-calendario]]"
status: implemented
tags: [diseno, inicio, coach, radios, web]
created: 2026-11-03
updated: 2026-11-03
---

# Inicio del coach: más ancho, semana más alta y radios (CYC-206)

> Rediseño del Inicio de la web del coach. Bloquea CYC-207 (implementación). **Contrastado con `origin/main` 3352f9b.** Estado: propuesto, pendiente de aprobación de la usuaria. Se ve en [`propuestas.html`](propuestas.html), con variantes, estados y anchos conmutables.

## Verificado contra origin/main 3352f9b

| Archivo | Qué hay hoy |
|---|---|
| `styles/layout.css` `.app-main` | `max-width: 1120px`, padding 32 / 24 (16 en móvil). Aplica a **todas** las pantallas. |
| `pages/AttentionPage.tsx` | Título «Inicio», botón **Invitar atleta**, `CoachHero` y `CoachWeekBoard`. |
| `components/CoachHero.tsx`, `styles/week-views.css` `.cy-strip` | Franja oscura (radio 16) con «N sesiones hoy» y atletas que necesitan atención. |
| `components/CoachWeekBoard.tsx` | Barra («Esta semana», rango, chip **Necesitan atención**, leyenda), encabezado de días, una tarjeta por atleta. |
| `styles/week-views.css` `.cb-*` | Rejilla `200px · 7 × 1fr · 80px`. `.cb-tile` con `min-height: 64px`, radio 12. `.cb-card` radio 18. `.cb-chip` y botones, radio 999. |
| #151 (CYC-203) | Líneas finas entre los días, «hoy» en `--color-blue-100`, fin de semana en `--color-gray-light`. **Se respeta tal cual.** |
| Responsive actual | ≤ 1000 px: encabezado oculto, 7 columnas de **solo glifo** de 44 px (sin nombre de rutina). |

**Lo medido** (el problema real): a 1440 px el contenido mide 1120 y cada día queda en ~100 px; con el nombre en una línea con puntos suspensivos («Full body…»), una celda con 2 o 3 sesiones no cabe y la mitad inferior de la pantalla queda vacía. Los radios actuales usan 22, 18, 16, 12 y 999 a la vez: la mezcla es lo que produce el aspecto de cápsulas.

## Recomendación

**Variante A, «Tablero fluido»**: el Inicio usa casi todo el ancho, la fila **crece** con las sesiones del día y los radios pasan a una escala única de rectángulos con esquinas redondeadas.

| Variante | Idea | Cuándo conviene |
|---|---|---|
| **A · Tablero fluido (recomendada)** | Una columna ancha; la fila crece con el día más cargado. | Siempre. Es el cambio mínimo que resuelve los tres problemas. |
| B · Tablero con panel lateral | A partir de 1440 px, «Necesitan atención» pasa a un panel fijo a la derecha. | Si la usuaria quiere que los avisos estén siempre a la vista; cuesta ancho de la semana. |
| C · Fila con tope | Máx. 2 sesiones por día y «+N más» abre un menú. | Solo como **válvula de seguridad** de A cuando hay 4 o más sesiones en un día. |

**Se recomienda A con la válvula de C:** hasta 3 sesiones por día se ven completas; desde la 4.ª, las 3 primeras y un enlace «+N más» que abre el día. B se descarta por ahora: el panel quita ancho justo donde se necesita y duplica los avisos que ya salen bajo el nombre de cada atleta.

## Uso del ancho

| Ventana | Regla |
|---|---|
| ≥ 1280 px (escritorio) | Contenido fluido con **`max-width: 1680px`** y padding lateral 32. Rejilla: `220px · 7 × minmax(116px, 1fr) · 88px`. A 1440 cada día mide ~150 px; a 1920 el contenido llega a 1680 y deja 120 px de margen a cada lado. |
| 641–1279 px (tablet y portátil chico) | El nombre del atleta y el resumen van arriba; debajo, los 7 días con **nombre de rutina visible** (hasta 2 líneas). Reemplaza al glifo de 44 px que hoy aplica desde 1000. |
| ≤ 640 px (móvil) | Se conserva el glifo de 44 px por día (el nombre no cabe), pero una celda con varias sesiones **apila** los glifos. Tocar un glifo abre la sesión. |

- Solo el Inicio del coach cambia su ancho máximo (modificador sobre `.app-main`). Las demás pantallas siguen en 1120 hasta decidir lo contrario.
- A 1920 no se pasa de 1680: más ancho alarga la lectura de izquierda a derecha sin aportar información.

## Semana más alta

- **Tile de sesión:** `min-height: 76px` (hoy 64), padding 10 × 12, nombre de la rutina **hasta 2 líneas** (`line-clamp`), estado en una línea y «Dolor» cuando aplique. Con tooltip y `aria-label` con el nombre completo.
- **Celda de día:** los tiles se apilan con 6 px de separación y **la fila crece**; no hay alto fijo. Ejemplos: 1 sesión ≈ 120 px de fila; 3 sesiones ≈ 280 px.
- **Varias sesiones en un día:** todas las celdas de la fila mantienen la misma altura y las vacías conservan las líneas de #151 de arriba a abajo.
- **Tope:** con 4 o más sesiones se ven 3 y «+N más».
- **Muchos atletas:** la lista sigue a lo largo de la página (sin scroll interno) con el encabezado de días pegado bajo el header, como hoy. Los atletas que necesitan atención van primero. Con más de 12 atletas, **Necesitan atención** es el atajo principal; una búsqueda por nombre queda fuera de este alcance.
- **Resumen de la derecha:** «3 de 5 sesiones» en una columna de 88 px.

## Escala de radios

Una sola escala, con nombres, para web y móvil. Rectángulos con esquinas redondeadas; la cápsula queda solo para etiquetas pequeñas y el avatar.

| Token | Valor | Para qué | Antes → ahora (Inicio) |
|---|---|---|---|
| `--radius-xs` | 4 px | Marcas internas: barra de color de atención, cuadrito de la leyenda | 3–4 → 4 |
| `--radius-sm` | 6 px | **Celdas y tiles de sesión**, tarjetas pequeñas | 12 → 6 |
| `--radius-md` | 8 px | **Botones**, chips de filtro, campos, ítems de menú | 999 → 8 |
| `--radius-lg` | 10 px | **Tarjetas de atleta**, banner de «sesiones hoy», paneles, listas vacías | 16 y 18 → 10 |
| `--radius-xl` | 12 px | Diálogos, hojas, tarjeta oscura grande de ciclo | 22 → 12 |
| `--radius-pill` | 999 px | **Solo** etiquetas pequeñas (estado, «Dolor», rango de semana, contador) | se conserva |
| (círculo) | 50 % | Avatar | se conserva |

Reglas:
1. Un elemento clicable que **no** es una etiqueta es `--radius-md` o menor. Nunca cápsula.
2. Un elemento anidado lleva un radio **igual o menor** que su contenedor (tile 6 dentro de tarjeta 10).
3. No se cambian colores, tipografía ni sombras.
4. Móvil usa los mismos nombres y valores. Hoy usa 22, 18, 14, 12 y 999; se alinea en una tarea posterior.

## Qué se muestra en cada elemento

- **Banner «sesiones hoy»** (`.cy-strip`): igual contenido, radio 10; **Invitar atleta** pasa a radio 8.
- **Barra «Esta semana»:** el rango de semana sigue siendo etiqueta (píldora); **Necesitan atención** es botón con radio 8 y contador.
- **Tarjeta de atleta:** radio 10, avatar redondo, nombre, ciclo y, si hay aviso, la etiqueta («Dolor reportado», «Sesión omitida») con la franja de color a la izquierda (4 px, radio 4).
- **Día de hoy:** encabezado y celda en `--color-blue-100`; el anillo de marca de los tiles de hoy se mantiene.
- **Fin de semana:** gris de #151.

## Estados (todos en la maqueta)

| Estado | Qué se ve |
|---|---|
| 1 atleta | La tarjeta no queda perdida: el tablero conserva el ancho y el alto mínimo de fila. |
| Muchos atletas (12) | Lista continua, encabezado pegado, atención primero. |
| 3 sesiones el mismo día | Tres tiles apilados; la fila crece sin recortar. |
| Sesión de hoy | Celda resaltada y anillo de marca en el tile. |
| Atleta que necesita atención | Franja de color + etiqueta con texto + panel expandible. |
| Sin sesiones esta semana | «Sin ciclo activo esta semana» con enlace **Crear ciclo**; el banner dice «Hoy no hay sesiones». |
| Sin atletas | Se conserva la franja actual «Empieza invitando a un atleta» (el tour de CYC-190 la reemplaza mientras esté activo). |

## Accesibilidad

- **Estado no solo por color:** completada = tilde + «Hecha»; omitida = cruz + «Omitida»; pendiente = círculo + «Pendiente»; dolor = texto «Dolor». La tarjeta con aviso lleva franja **y** etiqueta de texto.
- **Contraste:** textos de estado `#1e6b32` sobre `#e3f1e7`, `#9a4a00` sobre `#fff1e3` y `#a3282c` sobre `#fdecec` (todos ≥ 4,5:1). El azul de hoy en el encabezado es `#1a66dd` (no `#3080fc`).
- **Destinos táctiles:** tiles ≥ 76 px de alto en tablet y escritorio; glifos de 44 × 44 px en móvil; botones ≥ 40 px.
- **Nombre accesible:** cada tile mantiene `aria-label` «Rutina, día, estado».
- **Foco:** contorno de 2 px en `#1a66dd` con separación de 2 px, también sobre el gris del fin de semana.
- **Reflujo:** sin barra horizontal a 320 px; a 200 % de zoom pasa al diseño de tablet.
- **Movimiento:** no se añade ninguno; el hover actual se conserva y se desactiva con «reducir movimiento».

## Qué queda para otras pantallas

Atletas, Biblioteca, Ejercicios, Mi cuenta, auth y el resto de botones globales (`.button-primary`, `.button-secondary`, `.pill`) siguen en cápsula hasta una tarea de alineación posterior. Mientras tanto, el Inicio será la única pantalla con la escala nueva.

## Preguntas para la usuaria

1. ¿Apruebas la **variante A** con la válvula «+N más» a partir de 4 sesiones?
2. ¿Los botones del Inicio pasan ya a radio 8 aunque el resto de la app siga en cápsula unos días, o prefieres cambiar todas las pantallas a la vez?
3. ¿Está bien limitar el Inicio a 1680 px, o prefieres ocupar toda la ventana?

## Para CYC-207 (implementación)

- Tokens `--radius-*` en `styles/global.css`, usados primero en `week-views.css` (`.cb-*`, `.cy-strip`) y `home.css`.
- Modificador de ancho en `AppLayout` solo para la ruta Inicio del coach.
- `CoachWeekBoard`: `line-clamp` de 2 líneas, límite de 3 tiles con «+N más», rejilla nueva y regla de tablet (641–1279 px).
- Pruebas visuales a 1920, 1440, 1024, 768 y 390 px, y con 1, 5, 12 atletas y 3 sesiones el mismo día.


## Implementado (CYC-207)

Variante A con la válvula «+N más». Tokens `--radius-*` en `global.css`; ancho de 1680 px solo en el Inicio (`.app-main-inicio`); tablero con rejilla `220px · 7 × minmax(116px, 1fr) · 88px` desde 1280 px, diseño de tablet hasta 1279 px y glifos de 44 px hasta 640 px. Capturas en [`capturas/`](capturas/): escritorio 1920 y 1440, portátil 1024, tablet 768 y móvil 390.

La escala de radios se aplicó solo al Inicio; alinear Atletas, Biblioteca, Ejercicios y los botones globales queda en CYC-208.
