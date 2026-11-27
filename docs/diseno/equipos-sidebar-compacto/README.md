# Sidebar de Equipos: tamaños y letra

**La usuaria eligió la opción A, compacta (26-11): «la version compacta».** Solo diseño, solo web del coach. Parte de `origin/main` (a9d46b4). Comparación que se puede probar en [comparacion.html](comparacion.html); capturas en `capturas/`. Usa los estilos reales de la web sobre la propuesta del [calendario con arrastre](../calendario-equipo-arrastre/README.md), aprobado el 26-11.

## Pedido de la usuaria (26-11)

> «otra cosa que debemos cambiar es la optimización del sidebar y las dimensiones de este, además del tamaño de la fuente»

No indicó la dirección. Diseño propuso un sidebar más angosto y una letra más chica, para dar espacio al calendario, y la usuaria eligió esa versión.

## Medidas (navegador, a 1280 px de ancho)

| | Hoy | A, compacta (recomendada) | B, intermedia |
|---|---|---|---|
| Ancho del sidebar | 250 | 208 | 224 |
| Sidebar contraído | 72 | 60 | 64 |
| Letra de las herramientas | 16 | 14 | 15 |
| Alto de cada herramienta | 44 | 36 | 40 |
| Título | 28,8 | 24 | 26,4 |
| Panel de rutinas | 272 | 232 | 248 |
| Ancho de cada día | 99 | 113 | 107 |

Con A a 1440 px, cada día mide 136 px. Hoy a 1280 px se parten las cifras («10 de 10») y la fecha de hoy; con A caben en una línea. Los nombres largos de sesiones o eventos todavía pueden cortarse.

## Opción A (elegida)

- **Sidebar:** 208 px; contraído, 60 px. El botón de contraer pasa a la fila de «Herramientas»: ya no ocupa una fila propia y el nombre del equipo conserva todo el ancho. Contraído, queda arriba como hoy.
- **Letra:** 14 px en herramientas, selector, botones, filtros y calendario; 13 px en tarjetas y rutinas; **12 px como mínimo** en etiquetas; título de 24 px. La barra superior de la web no cambia.
- **Alturas:** herramientas 36 px, selector 40 px, botones 34 a 36 px, íconos 18 px.
- **Espacios:** el contenido usa 16 px a los lados; el panel de rutinas baja a 232 px.
- Los nombres de equipo que no quepan se cortan con «…» y se ven completos al pasar el cursor y en el menú.

## Opción B (descartada)

Solo reduce un paso: 224 px y letra de 15 px. El botón de contraer sigue en su fila.

## Alcance

- Se aplica a las cuatro herramientas de Equipos, que comparten el sidebar y los controles. La maqueta muestra solo Calendario; Ciclos, Eventos y Rankings **no se probaron** con estas medidas. El panel de rutinas también es el de la ficha del atleta: desarrollo debe limitar el cambio a Equipos o confirmar que se quiere en ambos.
- **Teléfono y pantallas táctiles:** se mantienen las medidas actuales, con zonas de toque de 44 px. Las nuevas solo aplican sobre 760 px de ancho y con puntero fino.
- Con el texto ampliado al 200 % se debe poder usar sin que se corten los controles. **No probado.**
- Se mantienen las formas actuales: no se cambian radios ni colores.

## Novedad

No lleva ficha: es un ajuste de tamaños.
