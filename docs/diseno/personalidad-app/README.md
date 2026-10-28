---
type: design
parent: "[[PRD-AppMovil]]"
status: decided
tags: [diseno, mobile, marca]
created: 2026-10-27
updated: 2026-10-28
---

# Personalidad de la app móvil

> Tres cambios para que la app tenga más marca y use menos espacio sin perder la estética: una animación de inicio con el logo, el anillo de la marca junto al título de cada pestaña y un diseño más compacto. **Decidido por la fundadora el 2026-10-28** (fondo oscuro, 1,6 s, opción A, compactar las tres pestañas, iOS y Android a la vez).

Se ve en [`propuestas.html`](propuestas.html) (animación con fondo oscuro o claro, carga rápida o lenta, y «Hoy» antes y después).

## Animación de inicio

- 1,6 s: los dos arcos del anillo se dibujan (0 a 0,7 s), el anillo da una vuelta (0,5 a 1,4 s) y aparece «Cycles» (1,2 a 1,6 s).
- Si la sesión aún carga, el anillo sigue girando. Si carga antes, la animación termina completa y entra a «Hoy».
- Con «reducir movimiento» se muestra el logo quieto con la palabra.
- Solo al abrir la app desde cero, no al volver de segundo plano.
- Fondo `#1f2228` y anillo `#3080fc`. La pantalla nativa de arranque (iOS `LaunchScreen.storyboard`, Android `app_window_background`) usa el mismo fondo para que no haya salto blanco.

## Logo dentro de la app

Opción A: el isotipo de 22 px, azul de marca, junto al título de «Hoy», «Calendario» y «Resumen» (componente `ScreenHeader`). Quieto, sin animar. No se incluyó la marca de agua (opción C).

## Medidas compactas

| Elemento | Antes | Ahora |
|---|---|---|
| Título de pestaña | 32 px, 14 px de margen | 24 px con el anillo, 8 px de margen |
| Tarjeta oscura de «Hoy» | relleno 18, número 48 px, nombre 26 px | relleno 14, número 34 px, nombre 22 px; número y barras en una fila |
| Botón de la tarjeta | relleno vertical 14 | 12 |
| Tarjeta de ejercicio | relleno 14, círculo 34, 10 de separación | relleno 12, círculo 28, 8 de separación |
| Tarjetas de «Calendario» y «Resumen» | relleno 14 y 16, 10 de separación | relleno 12 y 14, 8 de separación |

No cambian colores, tipografía, radios, la cadena de proteína, la isla flotante ni los destinos táctiles de 44 px. Quedan fuera de este cambio el registro de series y el cierre de sesión.
