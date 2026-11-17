# Novedad: compartir tu sesión (CYC-289)

Ficha **`athlete-share-session@1`** para la app del atleta, según el sistema de novedades (`../guia-novedades-bloques/README.md`, §4). Maqueta en [`propuestas.html`](propuestas.html) (tres ventanas: 390 × 640, 320 × 568 y letra ×1,6; interruptor «Reducir movimiento»). Capturas en `capturas/`. Estado: propuesta, pendiente de aprobación.

## Ficha

```ts
{
  key: "athlete-share-session", version: 1, since: "2026-11-17",
  platforms: ["mobile"], roles: ["athlete"],
  name: "Comparte tu sesión",
  slides: [
    { title: "Comparte tu sesión",
      text: "Al terminar, toca Compartir y llévate una imagen con el mapa de los músculos que trabajaste.",
      demo: "athlete-share-button",
      demoLabel: "En Hoy se toca Compartir y aparece la imagen de la sesión con el mapa de músculos." },
    { title: "Elige el formato de tu foto",
      text: "Post, Historia, Sticker o Sin fondo. Los dos últimos son transparentes para pegarlos sobre tu foto.",
      demo: "athlete-share-formats",
      demoLabel: "Se eligen cuatro formatos: Post, Historia, Sticker y Sin fondo; la vista previa cambia de forma." },
    { title: "Solo lo esencial",
      text: "Muestra ejercicios, series y duración. Nunca tus pesos, esfuerzo, notas ni tu nombre.",
      demo: "athlete-share-data",
      demoLabel: "Tres cifras de la sesión: ejercicios, series y duración." },
  ],
}
```

Textos de 91, 99 y 81 caracteres (límite 140), en tuteo. Sin `when`. Hay que sumar los tres ids a `NoveltyDemoId` en `packages/shared/src/novelties.ts` (lo hace Desarrollo, no Diseño).

## Demostraciones (se dibujan en código; la última fase es el resultado final para «reducir movimiento»)

| Slide | Fases (1,8 s cada una) | Resultado final |
|---|---|---|
| 1 · Comparte tu sesión | 1) Hoy con «Terminaste todos los ejercicios» y el botón Compartir. 2) se toca el botón. 3) aparece la imagen de la sesión. | Fase 3 |
| 2 · Elige el formato de tu foto | Se resalta Post, Historia, Sticker y Sin fondo; la vista previa cambia de forma y, en los dos últimos, aparecen los cuadros de transparencia. | Fase 4 |
| 3 · Solo lo esencial | Se resalta Ejercicios, Series y Duración; la última fase las junta con «Sin pesos, esfuerzo ni notas». | Fase 4 |

Datos de ejemplo fijos (5 ejercicios, 14 series, 52 min), nada del atleta real. Sin Resumen y sin promesa de rendimiento.

## Cuándo sale
Es una novedad de la app del atleta: aparece una vez, en una pestaña, 1,5 s después de cargar, y se reabre desde «Cómo usar Cycles › Novedades». La atleta nueva no la ve (su guía de primer uso ya trae «Compartir» en el cierre de la primera sesión).

## Aviso para quien construye
- En 320 px y con letra ×1,6 el pie con botones cae a dos filas en la slide 3 («Cerrar» y puntos arriba; «Atrás» y «Entendido» abajo): sigue visible y con botones de 44 pt, como en las otras novedades.
- La silueta de la slide 2 es la misma imagen del cuerpo que usa la app; en «Sin fondo» se oscurece solo en la maqueta para verse sobre los cuadros.
