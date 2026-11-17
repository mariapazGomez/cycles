---
type: design
status: propuesta
tags: [diseno, mobile, compartir]
created: 2026-11-16
---

# Imagen compartible de la sesión (CYC-289)

Estado: **propuesta, pendiente del «apruebo» de la usuaria**. Decisión de origen: CYC-288 (aprobada el 16-11). Contrastado con `origin/main` db26ce1. Maqueta en [`propuestas.html`](propuestas.html); las imágenes en `capturas/`.

## Alcance acordado (CYC-288)
- Mapa muscular de la **sesión terminada** + 3 datos: ejercicios, series, duración. Sin pesos, esfuerzo, dolor, notas, nombre del atleta ni del coach.
- Formatos 4:5 (1080×1350) y 9:16 (1080×1920), claro y oscuro.
- Marca: isotipo y nombre «Cycles» abajo, sin frase promocional.
- Botón «Compartir» al cerrar la sesión y en la sesión terminada de Hoy. **No** en Resumen (en rediseño: no se usa ni se toca).
- La imagen se genera en el teléfono; nada se sube a Cycles.

## Cómo se arma el mapa
Reutiliza `BodyMap.tsx` y `bodyZones.ts` (siete grupos, frente y espalda) y la misma rampa de un azul de `muscleSummary.ts` (`groupFill`: más series = más oscuro; sin carga = gris). En fondo oscuro la rampa se invierte (más series = más claro) para que el grupo más trabajado siga siendo el que más destaca. Es una pieza propia: no importa nada de la pantalla Resumen.

## Opciones (misma sesión de demo «Tirón», datos inventados)
- **A · Mapa protagonista.** Frente y espalda, tres datos debajo. Cubre cualquier sesión (pecho, piernas, espalda).
- **B · Cifra primero.** «16 series» enorme y una sola figura, la vista con más carga. Lectura inmediata; si la sesión carga ambos lados, una vista se queda corta.
- **C · Ciclos.** Como A, sobre arcos concéntricos derivados del isotipo (recurso de marca propio) y datos en tarjetas. Más marca, más ruido tras la figura.

**Recomendación: A.** Es la única que muestra bien cualquier sesión sin decisiones extra; B se puede ofrecer después como variante de historia.

## Formato extra: sticker sobre una foto (pedido de la usuaria, 16-11)
Además de 4:5 y 9:16, un tercer formato **«Sticker»**: PNG con fondo transparente y esquinas redondeadas (opción A) para pegarlo sobre una foto del atleta o de quien entrena. Dos tamaños: **Tarjeta** (vertical, 780 px) y **Compacta** (horizontal, 640 px, tapa menos la foto). Claro u oscuro. Demos en `capturas/demo-sticker-*.png` y `capturas/demo-foto-compacto-*.png` (fondo y silueta de relleno, no hay foto real).

## Cómo se llega a la imagen en la app (probado en código, 16-11)
Cuatro formatos: **Post** (4:5), **Historia** (9:16), **Sticker** (compacto) y **Sin fondo** (texto blanco u oscuro). Variante claro/oscuro, o texto blanco/oscuro en «Sin fondo».

**Entradas reales** (corrige la maqueta, que ponía «Sesión guardada» como entrada principal): esa pantalla solo existe en la primera sesión de cada atleta, así que la entrada universal es el botón **«Compartir» en Hoy**, bajo «Terminaste todos los ejercicios». La primera sesión además lo ofrece sobre «Volver a Inicio».

**Pantalla «Compartir tu sesión»:** vista previa real, selector de formato, variante y un solo botón primario **«Compartir»**, que abre la hoja del sistema (ahí están «Guardar imagen» y las apps). Se quitaron «Guardar en Fotos» y «Copiar sticker» de la maqueta para no sumar librerías nativas. Maqueta original: `capturas/flujo-compartir.png`.

## Estados
| Estado | Qué ve la persona |
|---|---|
| Lista | Vista previa y botón «Compartir» activo. |
| Generando | El botón muestra el indicador y se desactiva (evita doble toque). |
| Error al abrir la hoja | «No pudimos abrir la hoja para compartir. Intenta de nuevo.» bajo la vista previa; el botón vuelve a activarse. |
| Android | Aviso «Compartir la imagen estará disponible en Android pronto.» (solo iOS por ahora). |
| Cancela la hoja | Vuelve a la pantalla sin mensaje. |
| Sin permiso | No aplica: la hoja del sistema guarda con su propio permiso; la app no pide acceso a Fotos. |

## Casos límite
- **Un solo grupo muscular:** el mapa pinta solo esa zona; el resto queda en gris de «sin carga».
- **Muchos grupos:** la rampa se reparte por series; no se escribe la lista de grupos en la imagen.
- **Ejercicios sin grupo (cardio, otros):** cuentan en ejercicios, series y duración, pero no pintan el mapa.
- **Nombre largo de sesión:** `fitTitle` reduce la letra según el largo y, pasados 22 caracteres, corta con «…».
- **Duración desconocida:** si no hay hora de inicio, se omite el dato (no se inventa).
- **Sesión sin terminar:** no se ofrece «Compartir»; el botón aparece solo cuando se cumplen todos los ejercicios.

## Contraste AA (calculado)
| Par | Razón |
|---|---|
| Tinta `#1f2228` sobre `#eef3fc` (claro) | 14,3 : 1 |
| Tinta sobre blanco (Post con tarjeta) | 15,9 : 1 |
| Texto secundario `#4c5666` sobre `#eef3fc` | 6,7 : 1 |
| Blanco sobre `#1f2228` (oscuro) | 15,9 : 1 |
| Texto secundario oscuro `#b9c2d1` sobre `#1f2228` | 8,9 : 1 |
| Botón «Compartir» blanco sobre `#1a66dd` | 5,3 : 1 |
| Isotipo `#3080fc` (decorativo, no texto) | 3,4 : 1 claro, 4,3 : 1 oscuro |

«Sin fondo» queda sobre la foto de cada persona: se ofrece texto blanco u oscuro con contorno para que elija el que contraste.

## Preguntas abiertas
1. ¿Se muestra el **nombre de la sesión** («Tirón») como título? Está implementado así; es propio del plan, no del atleta.
2. ¿Fecha en la imagen? Se dejó fuera (nada de líneas grises bajo el título).
3. Claro/oscuro: hoy el atleta elige en la pantalla; no sigue el modo de la app.

## Texto alternativo (ejemplo)
«Sesión Tirón: 6 ejercicios, 16 series, 52 minutos. Grupos más trabajados: espalda y brazos.»

## Novedad
Ficha `athlete-share-session@1` (3 slides): ver [`../novedad-compartir-sesion/`](../novedad-compartir-sesion/README.md).

## Pendiente de verificar en un teléfono
Cómo se dibuja el SVG exportado (figura, halo de texto, transparencia del PNG) y que la hoja del sistema reciba la imagen. Android y la fuente de marca (Plus Jakarta Sans) quedan fuera por ahora.
