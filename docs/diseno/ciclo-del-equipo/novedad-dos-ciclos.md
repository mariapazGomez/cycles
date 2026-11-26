# Fichas de novedad: dos ciclos a la vez (CYC-316)

**Aprobadas por la usuaria (26-11).** Ya están en `main` desde el PR #276, con estos mismos textos y claves. Maqueta animada en [novedad-dos-ciclos.html](novedad-dos-ciclos.html); capturas `capturas-novedad/dos-ciclos-1..4.png` (las dos primeras son del coach).

Son **dos fichas**, una por rol, porque cada persona ve cosas distintas. Mismo popup de novedades; solo web (la app móvil no cambia en #276).

## Coach

```ts
{
  key: "coach-two-cycles", version: 1, since: "2026-11-25",
  platforms: ["web"], roles: ["coach"], name: "Dos ciclos por atleta",
  slides: [
    { title: "Los dos ciclos, a la vista",
      text: "Si un atleta lleva dos ciclos, su tarjeta muestra ambos, con la semana y las sesiones completadas de cada uno.",
      demoLabel: "La tarjeta de un atleta muestra un bloque por cada uno de sus dos ciclos.", demo: "two-cycles-card" },
    { title: "El aviso dice de qué ciclo es",
      text: "Así sabes dónde mirar. Con «Ver ciclos» abres su ficha y revisas cada uno.",
      demoLabel: "Sobre la tarjeta aparece el aviso de una sesión omitida con el nombre de su ciclo.", demo: "two-cycles-alert" },
  ],
}
```

## Atleta (web)

```ts
{
  key: "athlete-two-cycles", version: 1, since: "2026-11-25",
  platforms: ["web"], roles: ["athlete"], name: "Dos ciclos en Hoy",
  slides: [
    { title: "Tus dos ciclos en Hoy",
      text: "Si llevas dos ciclos a la vez, ves las sesiones de ambos, cada una con el nombre de su ciclo.",
      demoLabel: "En Hoy aparecen dos tarjetas, cada una con el nombre de su ciclo.", demo: "two-cycles-today" },
    { title: "Empieza la que quieras",
      text: "Una va abierta con sus ejercicios. La otra aparece resumida, lista para ver o empezar.",
      demoLabel: "Una tarjeta está abierta y la otra resumida, con su botón para empezar.", demo: "two-cycles-start" },
  ],
}
```

## Animaciones

Estado base = resultado final; con «reducir movimiento» queda la imagen final. Ciclo de 4,8 s.

- `two-cycles-card`: los dos bloques suben uno después del otro.
- `two-cycles-alert`: el aviso sube sobre la tarjeta.
- `two-cycles-today`: las dos tarjetas de «Hoy» suben una después de la otra.
- `two-cycles-start`: el botón «Empezar sesión» de la tarjeta resumida late una vez.

En la maqueta las dos tarjetas de «Hoy» van lado a lado solo para caber en el escenario; en la pantalla real van una debajo de otra.

## Notas

- Se muestran a todos los de cada rol, sin condición de «tiene dos ciclos».
- El popup muestra solo la novedad sin ver más reciente: si estas salen junto con `cycle-calendar@1`, el coach verá una por vez.
- Cuando la app móvil muestre los dos ciclos, conviene una ficha propia para la app.
