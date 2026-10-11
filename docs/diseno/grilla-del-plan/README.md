---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: decided
tags: [diseno, grilla, coach]
created: 2026-10-11
updated: 2026-10-11
---

# Grilla del plan: opciones de diseño

> Dos propuestas de la pantalla de detalle de un plan (`/cycles/:id`) en la web del coach. **La opción B es la oficial** (decisión de la fundadora, 2026-10-11). La A se conserva como alternativa por si más adelante se quiere una vista de matriz.

## Cómo verlas

Abre [`propuestas.html`](propuestas.html) en el navegador. Es una maqueta interactiva de un solo archivo: arriba alternas entre **A · Matriz** y **B · Cadena de semanas**, y entre **En curso** y **Recién creado**. Los nombres y las cifras son de ejemplo. También hay una copia privada en claude.ai: https://claude.ai/artifact/N5Eso8gL83GqyU1YRrtcUu

## Lo que comparten

Ambas usan el lenguaje del Inicio del coach (ver [[identidad-visual]], sección "Inicio del coach"): fondo gris azulado, tarjetas con sombra suave y una tarjeta oscura arriba.

- **Tarjeta oscura:** "2 de 5 semanas", la cadena de semanas como cuentas, "Esta semana lleva 1 de 3 sesiones" y un botón al resumen del atleta.
- **El atleta del plan se ve junto al título** (hoy la pantalla no lo dice).
- **Avisos del plan** en una tarjeta propia, con el botón de ajuste de carga ("Bajar 5 % desde semana 3") y "Descartar".
- **Cada celda** muestra la rutina, su estado (pendiente, completada, omitida), "Esfuerzo 7" y los minutos como datos separados, y "Dolor" si lo hubo. Las omitidas muestran su nota. No hay líneas con puntos medios.
- **Asignar rutina:** un panel sobre la grilla con la casilla "Repetir en las semanas que siguen vacías". Se resuelve con el endpoint actual, haciendo varias asignaciones seguidas.
- **Plan vacío:** tarjeta "Tu plan está vacío" sobre el motivo de proteína.

## Las dos opciones

| | A · Matriz | B · Cadena de semanas (oficial) |
|---|---|---|
| Forma | Semanas como columnas, sesiones como filas, como hoy | Columna vertical de semanas unidas como cuentas; cada semana es una tarjeta con sus sesiones |
| Semana en curso | Columna resaltada con "Esta semana" | Cuenta oscura con halo y etiqueta "Esta semana" |
| Fortaleza | Familiar; se ve todo el plan de un vistazo | Escala a planes largos, funciona bien en celular y repite la cadena del constructor de rutinas ("cada ciclo construye el siguiente") |
| Límite | En planes de 12 o más semanas obliga a desplazarse de lado; en celular queda incómoda | Pierde la vista de matriz de un vistazo |

## Decisión y pendientes

- **Oficial: B.** Es la que se construye en la web.
- **A como alternativa:** si más adelante se quiere, puede sumarse como vista alternativa dentro de B. No se construye ahora.
- **Panel de asignación:** queda inline sobre la grilla, como hoy, sin modal.
- **"Duplicar semana"** (copiar una semana con sus ajustes de carga) requiere un endpoint nuevo; no está en el alcance de esta primera versión.
- Todo el copy va en "tú", sin subtítulos grises bajo los títulos y sin emoji (ver [[voz-y-tono]]).
