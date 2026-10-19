---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: decided
tags: [diseno, plan, atleta]
created: 2026-10-16
updated: 2026-10-16
---

# Plan del atleta: diseño (T-172)

> Diseño de la pantalla del plan (`/cycles/:id`) para el **atleta** en la web, y de la lista «Mis planes». Resuelve el issue 2 de [`ISSUES.md`](../../ISSUES.md): hoy coach y atleta ven la misma grilla y el atleta no necesita armar nada. **Aprobado y construido en la web (2026-10-19).**

## Cómo verlo

Abre [`propuestas.html`](propuestas.html). Arriba alternas entre los estados (semana en curso, elegir día, empieza pronto, terminó, sin sesiones, Mis planes, Calendario y Calendario de la primera semana) y entre **Computador** y **Celular**. Los datos son de ejemplo.

## Qué cambia respecto a hoy

| Hoy (atleta) | Propuesta |
|---|---|
| La grilla del coach: todas las semanas, celdas vacías con «—», estado, esfuerzo y dolor | Solo **una semana a la vez**, con sus sesiones como filas grandes |
| Etiquetas técnicas (tipo de ciclo, fechas completas) | Solo el nombre del plan y su objetivo |
| Sin forma de saber qué toca ahora | Botón **«Te toca {Rutina}»** en la tarjeta oscura, que abre el registro |
| El día de cada sesión solo se elige entrando a la sesión | **Elegir día** desde la propia fila, en una hoja (igual que en la app) |

La app ya resuelve esto en **Calendario** (tarjeta oscura, chips de semana, tira de días, filas con «Elegir día»). Este diseño lleva ese mismo lenguaje a la web; no cambia nada en la app.

## Estructura de la pantalla (columna única de 760 px)

1. **Atrás** «← Mis planes», nombre del plan (Bricolage) y su objetivo.
2. **Tarjeta oscura** (la misma `PlanHero` del coach, con textos del atleta):
   - En curso: número grande de la semana, «de 5 semanas», cadena de cuentas, «Esta semana llevas 1 de 3 sesiones. En total, 4 de 15.» y el botón blanco **«Te toca {Rutina}»**.
   - Sin sesión pendiente (todo hecho esta semana): sin botón; la línea dice «Terminaste las sesiones de esta semana.»
   - Empieza pronto: «Empieza el {fecha}» y «Tu coach asignó {n} sesiones.»
   - Terminó: «El plan terminó», cadena completa y «Completaste {n} de {total} sesiones.»
   - Vacío: «Todavía sin sesiones» y «Tu coach aún no asigna rutinas a este plan.»
3. **Chips de semana** (S1 a S5): arranca en la semana en curso; punto azul en las semanas completas; desplazable en horizontal.
4. **Título de la semana:** «Semana 2» y, a la derecha, el rango «12 al 18 de octubre».
5. **Tira de días** (L a D): el día de hoy en círculo azul; punto oscuro si hay sesión ese día, verde si ya se completó.
6. **Filas de sesión**, una por sesión, en tarjetas blancas de 72 px de alto mínimo:
   - Nodo de 36 px: número de la sesión; check azul si está completada; ámbar si fue omitida.
   - Nombre de la rutina y debajo el día («Martes 13», «Hoy, viernes 16») o **«Elegir día»** en azul si no tiene.
   - Etiqueta de estado: Pendiente, Siguiente, Completada, Omitida.
   - La fila de la **siguiente** sesión lleva borde azul de 2 px y la etiqueta «Siguiente».
   - Tocar la fila abre la sesión; tocar el día abre la hoja de elegir día (no navega).

**Elegir día:** hoja flotante de 420 px sobre un velo, con «¿Qué día harás esta sesión?», el nombre de la rutina, la semana y siete botones de día. Los días pasados quedan deshabilitados. «Quitar el día asignado» deja la sesión sin día. En celular ocupa el ancho con 14 px de margen.

**Sin sesiones en la semana elegida:** tarjeta «No hay sesiones en esta semana.» con el mismo estilo del estado vacío.

## Mis planes (lista)

Una tarjeta por plan con nombre, etiqueta «Semana 2 de 5», segmentos por semana (azul lleno = completa, borde azul = en curso) y una línea con lo que toca («Te toca **Torso B**. Esta semana llevas 1 de 3.»). Secciones **Activo** y **Terminados**; el activo primero.

## Medidas y estilo

Tokens que ya existen; no se agrega ninguno.

| Elemento | Valor |
|---|---|
| Fondo de la página | `--color-page` (`#f3f5f8`) |
| Tarjetas | Blancas, radio 18 px, sombra `--shadow-card` (excepción vigente de las pantallas de plan) |
| Tarjeta oscura | `--color-ink`, radio 18 px, cadena de proteína solo a la derecha, nunca detrás del texto |
| Botón «Te toca» | Blanco, texto `--color-ink`, radio completo, alto mínimo 44 px |
| Nodo de sesión | 36 px; borde 1,5 px `--color-gray-border`; completada `--color-blue` lleno; omitida `--color-warn-bg` con borde `--color-warn-fill` |
| Chips de semana | Alto 40 px, ancho mínimo 48 px; elegido `--color-ink` lleno; semana en curso con borde `--color-brand` |
| Etiquetas | 12,5 px en negrita; Completada `--color-ok-*`, Omitida `--color-warn-*`, Siguiente `--color-blue-tint` con texto `--color-blue` |
| Tipografía | Títulos y números grandes en Bricolage Grotesque; el resto en Inter |
| Sin | Subtítulos grises bajo títulos, metadatos con puntos medios, emoji, degradados |

**Accesibilidad:** cada chip de semana es un botón con `aria-pressed`; la fila siguiente tiene `aria-label` «Siguiente: {Rutina}»; la hoja es un `dialog` que se cierra con Escape y devuelve el foco al día que la abrió; todos los destinos táctiles miden al menos 44 px de alto.

## Calendario del atleta (nuevo, 2026-10-18)

> **Aprobado y construido (2026-10-18).** Pedido de la fundadora: el atleta debe ver el calendario de los entrenamientos que **hizo** y los que **va a hacer**, y debe verse alentador cuando hay actividad, **como marcar en un hábito los días que se cumplió**, para generar adherencia. Abre el estado **Calendario** de [`propuestas.html`](propuestas.html).

**Dónde vive:** una pestaña nueva **Calendario** en la cabecera del atleta en la web (Hoy · Calendario · Mis planes), igual que la pestaña Calendario de la app. Reúne los planes del atleta en un solo mes.

**Cómo se marca cada día**

| Día | Marca | Por qué no depende solo del color |
|---|---|---|
| Entrenaste | Círculo `--color-blue` lleno con **check** blanco | El check |
| Entrenaste varios días seguidos | Los círculos se unen con una **banda** `--color-blue-200`: la cadena de la marca | La banda |
| Sesión programada | Círculo con borde azul de 1,5 px y el número | El borde |
| Omitida | Ámbar (`--color-warn-*`), sin tachar ni usar rojo | El borde ámbar y la leyenda |
| Hoy | Halo de 3 px; en negrita | El halo |
| Día elegido | Contorno de 2 px `--color-ink` | El contorno |

Una leyenda de tres entradas (Entrenaste, Programada, Omitida) va bajo el mes.

**Tarjeta oscura (lo alentador):** el número grande de **entrenamientos del mes**, cuatro puntos con las **semanas seguidas** en que hizo al menos una sesión (la misma racha semanal que ya calcula el Resumen de la app) y una línea: «Llevas 3 semanas seguidas entrenando.» Solo celebra: nunca muestra faltas, porcentajes bajos ni rojo.

**Primera semana, sin historial:** la tarjeta dice «Tu primera sesión es hoy» y «Cada día que entrenes quedará marcado aquí». Las sesiones programadas ya aparecen con borde azul, así que el calendario no se ve vacío.

**Interacción:** tocar un día muestra debajo sus sesiones (con el mismo estilo de fila del plan, que abre la sesión). Flechas de mes de 44 px; el mes siguiente se deshabilita después del último mes con plan.

**Datos:** sale de lo que ya existe (sesiones de los planes del atleta). Una sesión hecha se marca el día en que se **empezó** (`startedAt`) y, si no hay hora de inicio, el día que se eligió; las pendientes y omitidas usan el día elegido. Las sesiones sin día asignado no aparecen en el calendario; se ven en el plan.

**Decisiones confirmadas (2026-10-18)**

4. **Pestaña Calendario** entre Hoy y Mis planes (recomendado), en lugar de dentro de cada plan.
5. **La banda entre días seguidos** como marca de cadena (recomendado). Alternativa: solo los círculos con check, sin banda.
6. **Racha por semanas** (al menos una sesión hecha en la semana) en lugar de por días, porque los planes tienen 2 a 4 sesiones por semana y una racha diaria castigaría los días de descanso.

## Lo que no cambia

- La vista del **coach** (grilla B oficial, ver [[grilla-del-plan]]).
- Los macrociclos: el atleta sigue viendo la lista de sus planes hijos; no se rediseña ahora.
- La app: Calendario ya cumple con este diseño.

## Decisiones por confirmar

1. **Botón «Te toca {Rutina}»** en la tarjeta oscura (recomendado), que abre el registro de la siguiente sesión.
2. **Elegir día en la web** desde la fila. Hoy solo se puede dentro de la sesión; con este diseño la web queda igual que la app.
3. **Una semana a la vez** (recomendado) en lugar de mostrar todas las semanas apiladas como en la vista del coach.
