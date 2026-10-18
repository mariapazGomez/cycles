---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: decided
tags: [diseno, notificaciones, atleta]
created: 2026-10-16
updated: 2026-10-16
---

# Avisos de atleta y coach: diseño (T-152)

> Campana, lista y estados vacíos, más las reglas de qué se avisa y con qué texto. **Decidido por la fundadora el 2026-10-16**, para atleta y coach. Se construye en T-153 a T-155 (atleta) y T-170 y T-171 (coach).

## Cómo verla

Abre [`propuestas.html`](propuestas.html) en el navegador. Arriba alternas entre **Atleta** y **Coach**, entre **Web**, **App iOS** (solo atleta) y **Textos y reglas**, y entre los estados (con avisos, panel cerrado, sin avisos, no cargó). Los nombres y las horas son de ejemplo.

## Avisos del atleta

**Eventos (los tres de la tarea, más el agrupado):**

| Evento | Título | Texto | Abre |
|---|---|---|---|
| Plan nuevo asignado | Plan nuevo | «{Coach} te asignó {Plan}. Ya puedes verlo.» | El plan |
| Sesión nueva en un plan activo | Sesión nueva | «Hay una sesión nueva en {Plan}: {Rutina}.» | La sesión |
| Cambio en una sesión ya asignada | Cambió tu sesión | «{Coach} ajustó {Rutina} del {día}. Revísala antes de entrenar.» | La sesión |
| Varios cambios seguidos | Cambios en {Plan} | «{Coach} hizo {n} ajustes. Revísalos antes de entrenar.» | El plan |

**Canales:** campana dentro de la web y de la app. El push de iOS y el correo quedan como extras para después (no se diseñan ahora).

**Regla de no repetir ni inundar:**
- El aviso sale cuando pasan **10 minutos sin cambios** en ese plan, para que no llegue uno por cada ejercicio que el coach agrega.
- Si ya hay un aviso del mismo plan y tipo **sin leer**, no se crea otro: se actualiza el texto («Cambios en {Plan}», con el número) y la hora. Si ya estaba leído, el siguiente cambio crea uno nuevo.
- Un plan vacío no avisa. «Plan nuevo» sale cuando tiene al menos una sesión con ejercicios.
- No avisan: sesiones ya completadas, omitidas o con series registradas; renombrar el plan.

**Sin datos de salud (R7):** ningún aviso lleva cargas, esfuerzo, dolor, notas ni peso corporal. Solo el nombre del coach, del plan y de la rutina, y el día.

**Retención:** 30 días y máximo 50 por atleta; la lista muestra los 20 más recientes.

## Dónde va

- **Web:** campana de 44 px de área táctil en la cabecera, a la izquierda del avatar. Abre un panel de 380 px anclado a ella (en celular ocupa el ancho con 12 px de margen). Se cierra con Escape o al tocar fuera.
- **App iOS:** campana en el encabezado de **Hoy**, a la izquierda del avatar. Abre una pantalla «Avisos» (no es una cuarta pestaña: la isla de tres pestañas no cambia y se oculta mientras estás en ella).

## Medidas y estilo (para construir tal cual)

Tokens que ya existen en `global.css` y `apps/mobile/src/theme/colors.ts`; no se agrega ninguno.

| Elemento | Valor |
|---|---|
| Campana | Icono de trazo redondeado de 22 px (web) y 24 px (app) en `--color-ink`; área táctil 44 × 44 px; fondo `--color-gray-light` al pasar el cursor o con el panel abierto |
| Número de sin leer | Círculo `--color-blue` de 20 px de alto (mínimo 20 de ancho), texto blanco de 11 px en negrita, borde de 2 px del color del fondo; de 1 a 9, desde 10 muestra «9+»; sin pendientes no se dibuja |
| Aviso sin leer | Fondo `--color-blue-tint` (`#eaf2ff`) y cuenta de 36 px `--color-blue` llena con el icono en blanco |
| Aviso leído | Fondo blanco y cuenta de 36 px blanca con borde de 1,5 px `--color-gray-border` e icono `--color-ink-secondary` |
| Título del aviso | Inter 700, 14,7 px (0,92 rem); el texto debajo en 14 px; la hora a la derecha en 12,5 px `--color-ink-secondary`, sin saltar de línea |
| Iconos por evento | Plan nuevo: nodos conectados; sesión nueva: más; cambio: lápiz |
| Panel web | Fondo blanco, borde 1 px `--color-gray-border`, radio 14 px, sombra de capa flotante (la única sombra en esta pantalla, como el menú de usuario) |
| Pantalla de la app | Fondo `bgApp`, una sola tarjeta blanca de radio 18 con sombra suave; filas de al menos 44 px; título «Avisos» en Bricolage |
| Separadores | Línea de 1 px entre avisos; no hay línea bajo el título ni metadatos con puntos medios |

**Interacción:**
- Tocar un aviso lo marca como leído y abre el plan o la sesión.
- «Marcar todo como leído» (solo si hay sin leer): en la web va en el encabezado del panel; en la app, sobre la tarjeta, alineado a la derecha.
- La web actualiza el número al abrir la pestaña y cada 60 segundos mientras esté visible; la app, al volver a primer plano y al deslizar hacia abajo.
- Etiquetas de accesibilidad: «Avisos, 3 sin leer» o «Avisos, ninguno sin leer».

**Estados:**

| Estado | Texto |
|---|---|
| Sin avisos | **Todo al día.** «Cuando tu coach cambie algo en tu plan, lo verás aquí.» (con la cadena de proteína de fondo, solo detrás del texto) |
| No cargó | **No pudimos cargar tus avisos.** «Revisa tu conexión e inténtalo de nuevo.» Botón «Reintentar» |
| Cargando | Tres filas de esqueleto con la cuenta gris; sin spinner |

## Datos que necesita la API (guía para T-153)

Cada aviso guarda: `id`, `type` (`plan_assigned`, `session_added`, `session_changed`), `planId`, `sessionId` (opcional), `count` (para el agrupado), `payload` con `coachName`, `planName`, `routineName` y `dayLabel`, `readAt` y `createdAt`. Endpoints mínimos: lista (los 20 más recientes), contador de sin leer, marcar uno y marcar todos. Los textos se arman en el cliente a partir del `type` y el `payload`, no se guardan ya escritos.

## Decisiones (confirmadas 2026-10-16)

1. **Espera de 10 minutos antes de avisar**, en lugar de avisar al instante. Con la espera no se inunda al atleta mientras el coach arma. **El coach no hace ningún paso extra:** no hay botón «Avisar ahora», ni pregunta del tipo «¿quieres avisar al atleta?», ni otra acción para notificar; el aviso es directo y sale solo (decidido 2026-10-17).
2. **«Plan nuevo» solo con contenido.** Como el estado borrador ya no existe, un plan recién creado y vacío es visible para el atleta; con esta regla no recibe aviso hasta que haya una sesión con ejercicios.
3. **Campana solo en Hoy (app).** No se repite en Calendario ni en Resumen, para no recargarlas.

## Avisos del coach

Los coaches usan solo la web (no hay app de coach), así que el diseño es la misma campana y el mismo panel de la cabecera, a la izquierda del menú de usuario.

**Eventos:**

| Evento | Título | Texto | Abre |
|---|---|---|---|
| El atleta programa una sesión | Sesión programada | «{Atleta} programó {Rutina} para el {día}.» | El plan, en esa sesión |
| El atleta programa varias seguidas | Sesión programada | «{Atleta} programó {n} sesiones en {Plan}.» | El plan |
| Registra una sesión completa | Sesión completada | «{Atleta} completó {Rutina}.» | El registro de la sesión |
| Registra una parte | Completó una parte | «{Atleta} completó una parte de {Rutina}.» | El registro de la sesión |
| No pudo entrenar | Sesión omitida | «{Atleta} no pudo entrenar {Rutina}. Quedó como omitida.» | El registro de la sesión |
| Varios registros seguidos sin leer | Sesiones registradas | «{Atleta} registró {n} sesiones.» | El resumen del atleta |

**Diferencias con el atleta:**
- La cuenta de cada aviso lleva las **iniciales del atleta** en lugar de un icono: al coach le importa primero quién. El tipo de evento lo dice el título. Sin leer = cuenta azul con iniciales blancas; leído = cuenta vacía con borde.
- **Programar** usa la misma espera de 10 minutos desde la última sesión que el atleta programó, así que asignar los días de toda la semana es un solo aviso. Mover una sesión a otro día cuenta como programar.
- **Registrar** avisa **al cerrar la sesión** (cuando el atleta guarda cómo le fue), no por cada serie, y sin espera. Reabrir no avisa; al cerrar otra vez se actualiza el aviso de esa sesión, no se duplica.
- **Agrupar:** si hay un aviso del mismo atleta y tipo sin leer, se actualiza (número y hora); si ya estaba leído, se crea uno nuevo.
- Solo de atletas con relación activa con ese coach.
- **R7:** el aviso dice qué pasó (completada, parte, omitida) y nunca esfuerzo, dolor, notas, cargas ni peso corporal; eso se ve al abrir el registro. El dolor reportado sigue en «Necesitan atención» del Inicio: los avisos cuentan lo que pasó y «Necesitan atención» lo que hay que resolver, sin repetirse.
- Sin avisos: **Todo al día.** «Cuando tus atletas programen o registren una sesión, lo verás aquí.» El estado de error y las medidas son los mismos.
- Retención: 30 días y máximo 50 por coach.

**Datos para la API:** mismos campos que el atleta, con tipos `session_scheduled` y `session_logged`, más `athleteId`, `athleteName` y `outcome` (`completed`, `partial`, `skipped`) en el `payload`. Los avisos del atleta y del coach pueden compartir tabla con el destinatario como `userId`.

## Relación con otras tareas

- Responde la pregunta pendiente del issue 1 de [`ISSUES.md`](../../ISSUES.md) («cuándo notificar al atleta»): el aviso sale solo, a los 10 minutos sin cambios, sin acción del coach.
- Todo el copy va en «tú», sin subtítulos grises ni emoji (ver [[voz-y-tono]]).

## Confirmado para el coach

- Una sesión **omitida** avisa igual que una completada.
- **Reprogramar** una sesión cuenta como programar: un aviso con el día nuevo.
