---
type: design
status: proposed
tags: [diseno, app-movil, hoy, calendario, resumen, accesibilidad]
created: 2026-11-07
updated: 2026-11-07
---

# Vistas de la app: Hoy, Calendario y Resumen (v2 adaptable)

> Contrastado con `origin/main`. Estado: propuesto. Maqueta en [`propuestas.html`](propuestas.html), con un configurador de tamaño de letra y ancho. A partir de una referencia de la usuaria (no se copia literal: se omiten calorías, ánimo, fotos, mensajes y objetivos; la navegación sigue siendo la **isla**).

## Lenguaje visual

Perlas de color con pictograma (mismos glifos de CYC-237), tarjetas blancas de 22 px de radio con sombra azulada (sin degradados), fondo `#eef3fc`, anillo del ciclo con una **perla al final** del arco. Botones y segmentos activos en `#1a66dd` (texto blanco 5,2:1; el `#3080fc` de marca no alcanza 4,5:1 con texto blanco, queda para fondos y gráficos).

## Hoy: orden y aviso del coach

Orden decidido por la usuaria:

1. **Resumen:** anillo del ciclo y tres cifras (sesiones de la semana, tiempo entrenado, esfuerzo medio).
2. **Rutina de hoy:** «Torso B» con el botón grande **Iniciar rutina** y, dentro de la misma tarjeta, «Hoy también: voleibol».
3. **Aviso «Tu coach agregó una rutina»** (tarjeta de su referencia). Solo aparece si hay algo nuevo; toda la tarjeta es un botón de 56 px o más; al abrirla desaparece y la campana pierde su punto rojo. Con varias: «Tu coach agregó 2 rutinas». Texto sin puntos medios («Torso B, fuerza» y «Para hoy, 5 ejercicios»). La hora y la duración solo se muestran si el coach las definió (hoy las sesiones no tienen hora); hace falta una novedad en la API y en `NotificationsScreen`.
4. **Próximas:** dos filas.

**Sin sesión hoy:** la tarjeta dice «Hoy no tienes sesión», «Tu siguiente: Piernas pesadas, vie 13 nov» y el botón **Adelantar Piernas pesadas**, con la nota «Se registra hoy y tu coach lo verá. Si no la haces hoy, sigue el viernes.». Es el mismo mecanismo de «Asignadas para hoy / Hacer esta» que ya existe en `TodayScreen`.

## Cómo se adapta (tamaño de letra, tamaño de iconos y pantalla)

La maqueta usa un factor de letra `--f` (×0,85 a ×2; en iOS equivale a Dynamic Type hasta Accesibilidad, en Android a «Tamaño de fuente» y «Tamaño de pantalla») y un ancho de 320 a 430 px.

| Regla | Cómo |
|---|---|
| Texto | Todo escala con `--f`. Tamaños base: 12 px mínimo, 15 px cuerpo, 22 px títulos. Nunca se corta en una línea: baja a varias. |
| Zonas táctiles | Mínimo **44 px** sin importar la configuración; crecen con la letra hasta 56 px (botones redondos). Botón principal ≥ 52 px. |
| Perlas e íconos | Escalan con la letra pero **se detienen en ×1,35** para no devorar la pantalla; el texto sigue escalando. |
| Separaciones | Márgenes y rellenos escalan con la letra (el diseño «respira» más, no se aprieta). |
| Reorganización | Con letra ×1,3 o más, o ancho menor a 340 px, `data-big`: la cabecera pasa a dos líneas, el aviso del coach apila la perla y el texto, el anillo va arriba y las cifras debajo, se ocultan las etiquetas de las filas (Coach, Evento) y las líneas pequeñas de los ejercicios. |
| Mes | En el mes, con letra grande cada día muestra **una** perla y «+N»; el detalle del día debajo sigue completo. |
| Pantalla | Se desplaza; lo importante (aviso, sesión de hoy y botón) queda en los primeros 600 px incluso con letra ×2. |
| Isla | Fija, 4 botones de 54 × 44 px; no escala con la letra (es de iconos). |

En código (React Native): `allowFontScaling` por defecto, `maxFontSizeMultiplier` de 2 en textos de cuerpo, `useWindowDimensions()` y `PixelRatio.getFontScale()` para el modo grande, y `minHeight` en lugar de alturas fijas.

## Accesibilidad (WCAG 2.1 AA, revisión visual)

- Contraste: tinta `#1f2228` y gris `#5c6068` sobre blanco y sobre `#eef3fc` superan 4,5:1; `#1a66dd` sobre blanco 5,2:1. Los pictogramas blancos sobre naranja o verde son decorativos: siempre van con texto al lado.
- El estado nunca va solo en color: «Hecha», «Siguiente», «+N», el punto de la campana con su nombre accesible («Notificaciones, 1 nueva»).
- Cada tarjeta táctil tiene nombre accesible completo («Tu coach agregó una rutina: Torso B, para hoy, 5 ejercicios. Abrir»).
- **Por verificar en la implementación:** orden de lectura, anuncio del aviso al abrir la app, reflujo real con Dynamic Type y TalkBack/VoiceOver, y que `maxFontSizeMultiplier` no corte nada.

## Pantallas

- **Calendario:** Semana | Mes, mes con una perla por actividad (dos como máximo, luego «+N»), leyenda, detalle del día debajo; semana con encabezado por día.
- **Resumen:** Ciclo | Semana, anillo de sesiones, «Cómo van tus ejercicios» (peso y repeticiones con su línea, como en `resumen-atleta`) y «Qué músculos trabajas» plegado.

## Preguntas

1. «Adelantar» una sesión: ¿la sesión se mueve a hoy (y el viernes queda libre) o se hace hoy y el viernes sigue como estaba? La maqueta supone lo segundo no; confírmalo.
2. ¿Mostramos hora y duración en el aviso aunque hoy las sesiones no tengan hora (se agregaría al modelo)?
3. ¿Dejamos «Esfuerzo medio» en Hoy? Sale del esfuerzo percibido registrado.
4. ¿Aplicamos este lenguaje al resto (Asistente, sesión, perfil)?
