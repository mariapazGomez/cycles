---
type: design
status: proposed
tags: [diseno, app-movil, hoy, calendario, resumen]
created: 2026-11-07
---

# Vistas de la app: Hoy, Calendario y Resumen

> Contrastado con `origin/main`. Estado: propuesto. Maqueta en [`propuestas.html`](propuestas.html). A partir de una referencia de la usuaria (no se copia literal: se omiten calorías, ánimo, fotos, mensajes, objetivos y la barra de pestañas; la navegación sigue siendo la **isla**).

## Lenguaje visual (con más personalidad)

- **Perlas de color** con pictograma relleno (mismos glifos que las actividades paralelas, CYC-237). Sesión del coach: perla azul de marca con pesas, con anillo en la siguiente; deportes en naranja, descanso en verde azulado, partido en tinta, viaje en gris.
- **Tarjetas blancas** de 22 px de radio con **sombra azulada** (sin degradados ni brillo) sobre fondo `#eef3fc`.
- **Anillo del ciclo** en azul de marca con una **perla al final** del arco (guiño al logo).
- Controles segmentados en píldora (azul activo). Fuente del sistema, texto ≥ 11 px.

## Pantallas

- **Hoy:** saludo con la semana, anillo de avance del ciclo con tres cifras (sesiones de la semana, tiempo entrenado, esfuerzo medio), «Entrenamiento de hoy» con botón grande **Iniciar rutina**, fila «Hoy también: voleibol» (CYC-237) y «Próximas» con sesiones y eventos.
- **Calendario:** **Semana | Mes**. Mes con una perla por actividad en cada día (dos máximo, luego «+N»), leyenda, tocar un día abre su detalle. Semana con encabezado por día y tarjetas tintadas.
- **Resumen:** **Ciclo | Semana**, anillo de sesiones, «Cómo van tus ejercicios» (peso y repeticiones con su línea, como en `resumen-atleta`) y «Qué músculos trabajas» plegado.

## Preguntas

1. ¿Te gusta el nivel de color y redondeo, o más sobrio?
2. «Esfuerzo medio» sale del esfuerzo percibido (sRPE) ya registrado: ¿lo dejamos en Hoy?
3. ¿Aplicamos este lenguaje al resto de pantallas (Asistente, sesión, perfil)?
