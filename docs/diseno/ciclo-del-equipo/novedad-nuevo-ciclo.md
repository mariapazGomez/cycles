# Ficha de novedad: «Nuevo ciclo» por calendario (CYC-316)

Para el PR #274. **Aprobada por la usuaria (25-11).** Maqueta animada en [novedad-nuevo-ciclo.html](novedad-nuevo-ciclo.html); capturas del estado final en `capturas-novedad/`.

Usa el popup de novedades que ya existe (`docs/diseno/guia-novedades-bloques`, `styles/novelty.css`, escenario de 648 × 292). Solo web y solo coach. Se muestra una vez; las cuentas nuevas la reciben como vista, igual que las demás.

## Ficha

```ts
{
  key: "cycle-calendar",
  version: 1,
  since: "<fecha en que se publica>",
  platforms: ["web"],
  roles: ["coach"],
  name: "Nuevo ciclo por calendario",
  slides: [
    {
      title: "Crea tu ciclo en un calendario",
      text: "Escribe el nombre y toca el primer y el último día. La duración sale sola.",
      demoLabel: "En un calendario se marca el primer día, se pinta el rango, se marca el último y aparece la duración.",
      demo: "cycle-range",
    },
    {
      title: "Menos cosas que rellenar",
      text: "Ya no pedimos tipo de ciclo ni sesiones por semana. A mano van el nombre y, si quieres, el objetivo.",
      demoLabel: "Los campos antiguos se apartan y quedan el nombre, el objetivo opcional y las fechas del ciclo.",
      demo: "cycle-fields",
    },
    {
      title: "Fechas sin sorpresas",
      text: "Un ciclo nuevo empieza desde hoy. Si al cambiar las fechas quedan sesiones fuera, muévelas o quítalas.",
      demoLabel: "Los días pasados no se pueden elegir. Al acortar el ciclo, tres sesiones quedan fuera y aparece un aviso.",
      demo: "cycle-guard",
    },
    {
      title: "Tus plantillas, por semanas",
      text: "Define cuántas semanas dura. Al asignarla, eliges solo el primer día.",
      demoLabel: "Una plantilla de dos semanas: se elige el primer día y el calendario pinta el resto.",
      demo: "cycle-template",
    },
  ],
}
```

Textos: 74, 100, 102 y 69 caracteres (máximo 140). Botones: «Siguiente» y, en la última, «Entendido»; «×» cierra.

## Animaciones

Sumar `cycle-range`, `cycle-fields`, `cycle-guard` y `cycle-template` a `NoveltyDemoId`. Como en las demás, **el estado base es el resultado final** y la animación llega a él; con «reducir movimiento» queda la imagen final. Ciclo de 4,8 s en bucle.

| Demo | Qué se mueve |
|---|---|
| `cycle-range` | El primer día se pone azul; los días intermedios se pintan uno tras otro (45 ms entre cada uno); el último día se pone azul; la frase de la duración sube desde abajo. |
| `cycle-fields` | «Tipo de ciclo», «Sesiones por semana», «Fecha de inicio» y «Duración», tachados, se apartan a la derecha y se atenúan en cadena; la tarjeta con los tres campos nuevos gana presencia. |
| `cycle-guard` | El último día del rango queda marcado; las tres sesiones que quedan fuera se tiñen y aparece el aviso. Los días pasados están apagados todo el tiempo. |
| `cycle-template` | El primer día se elige y el rango de dos semanas se pinta solo; aparece la fecha final. |

Los nombres de las claves y de las demos son una sugerencia.
