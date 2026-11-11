# Maquetas del teléfono de la landing, actualizadas (CYC-188)

Contenido y guion de las tres maquetas animadas de la app del atleta (`PhoneScreens.tsx` y `phoneStory.ts`), puestas al día con la app actual de `origin/main` (Hoy con «Esta semana», sesión por bloques, isla de cuatro íconos). Son **especificaciones para quien las construya** (CYC-216): no cambia código de la landing. Las referencias visuales ya existen: Hoy en [`../vistas-app/propuestas.html`](../vistas-app/propuestas.html) y los bloques en [`../sesion-por-bloques/propuestas.html`](../sesion-por-bloques/propuestas.html).

## Datos de ejemplo (coherentes con las capturas de la web)

Atleta: **Matías Fuentes**, ciclo «Fuerza base», semana 4 de 6. Sesión del día: **Empuje**, con tres bloques.

| Bloque | Ejercicios |
|---|---|
| Calentamiento (ámbar) | Pájaros con mancuernas, 2 × 15 |
| Fuerza (verde) | Press de banca con barra 4 × 6 a 50 kg · Press inclinado con mancuernas 3 × 10 · Aperturas con mancuernas 3 × 12 · Fondos en paralelas 3 × 8 |
| Core (violeta) | Plancha abdominal 3 × 30 |

«Esta semana», 9 al 15 nov: antes de la sesión **1 de 3**, 33 %; al cerrarla **2 de 3**, 67 %. Tiempo entrenado 3 h 20 min; esfuerzo medio 6,5.

## Cambios respecto de las maquetas actuales

| # | Cambio | Estado |
|---|---|---|
| A1 | Isla de cuatro íconos sin etiquetas (Calendario, Inicio, Resumen, Asistente) | Ya aprobado (README) |
| A2 | Título con el anillo de marca y medidas compactas | Ya aprobado |
| A3 | Nota del coach en el ejercicio de Serie | Ya aprobado |
| A4 | Barra de estado limpia: 9:41 y batería llena | Ya aprobado |
| **A6** | **Hoy con la tarjeta «Esta semana» arriba** (anillo de 76 px con el porcentaje, y tres cifras con perla: Sesiones, Tiempo entrenado, Esfuerzo medio), y la rutina de hoy debajo | **Nuevo** |
| **A7** | **Sesión por bloques:** en Hoy y en la sesión, un encabezado por bloque con su perla y color, y la insignia de avance («0 de 1», «Hecho»); el bloque en curso abierto y los hechos plegados | **Nuevo** |
| **A8** | **El anillo semanal avanza al cerrar la sesión** (33 % → 67 %): cierra la historia mostrando que lo que hace el atleta se refleja en su semana | **Nuevo** |

## Maqueta 1: Hoy

- Encabezado «Hola, Matías». Debajo, la tarjeta **«Esta semana»** con «9 al 15 nov», el anillo en 33 % («1 de 3») y las tres cifras.
- Tarjeta de la sesión: perla de pesas, «Empuje», «Semana 4, sesión 2» y el botón **Iniciar rutina**.
- Fila «Hoy también: fútbol, 20:00» (actividad que agregó el atleta; es la misma que el coach ve en su calendario).
- Isla de cuatro íconos con «Inicio» resaltado.

## Maqueta 2: Serie

- Título del bloque «Fuerza» con su perla y «1 de 4 ejercicios».
- Ejercicio **Press de banca con barra**, «Serie 2 de 4», peso 50 kg, repeticiones 6, selector de reps en reserva.
- Línea **«Nota de tu coach: Baja lento y cuida el hombro»** (A3).
- Botón **Guardar serie**.

## Maqueta 3: Cierre

- «Cuéntale a tu coach»: esfuerzo de la sesión en una escala de 1 a 10 (7), campo de nota con una frase («Me sentí fuerte, el hombro bien») y **Enviar**.
- Al enviar, vuelve a Hoy con los bloques con insignia **Hecho** y la tarjeta «Esta semana» en **67 %, 2 de 3** (A8).

## Guion de la animación (el dedo recorre las tres)

1. Hoy: el dedo toca **Iniciar rutina**.
2. Serie: sube el peso a 50 kg, elige reps en reserva 2 y toca **Guardar serie**.
3. Hoy: el avance del bloque pasa de «0 de 1» a **Hecho** y el botón dice **Cerrar sesión**.
4. Cierre: marca esfuerzo 7, escribe la nota y toca **Enviar**.
5. Hoy otra vez: el anillo de «Esta semana» sube de 33 % a 67 %.

Se mantiene lo ya decidido: solo el teléfono activo se ve nítido; se anima solo mientras está a la vista y **no con «reducir movimiento»** (en ese caso se ve el último cuadro, el de 67 %); las pruebas se hacen en 320, 390 y 768 px y con letra grande.

## Qué no cambia

Colores de la marca (`#3080fc` para fondos y gráficos, `#1a66dd` para botones), sistema de fuente del teléfono y los textos en «tú». No se muestra «Adelantar» (decisión pendiente). Etiqueta bajo cada maqueta: **«Datos de ejemplo»**.

## Capturas reales del simulador (pendiente: esta noche)

La usuaria tiene simulador de iPhone y prefiere hacerlas por la noche. Pantallas: **Hoy** (con «Esta semana»), **Serie**, **Cierre**, **Resumen** y la **sesión por bloques**. Pasos, cuando llegue el momento:

1. Regenerar `cycles_demo` ese día y levantar la API de la demo en el puerto 3000 sin Resend ni Slack (MANUAL-DEMOS §2 y §3); la web no hace falta.
2. Abrir la app en el simulador (iPhone de 6,1", letra normal, modo claro). La app en desarrollo apunta sola a `localhost:3000`.
3. **La usuaria inicia sesión** con el atleta de la demo (la contraseña está en `~/.cycles-secretos/demo/DEMO_PASSWORD`; el agente no la escribe).
4. El agente captura con `xcrun simctl io booted screenshot` cada pantalla; la sesión de ejemplo es una que tenga bloques (de la semana 3 en adelante).
5. Sin datos reales. Verificar que no sale ningún popup de novedad antes de capturar (saltarlo una vez).
