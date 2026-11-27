# Ciclo y rutinas desde el calendario del equipo

**Aprobado por la usuaria (26-11): «Sí, apruebo».** Incluye la ficha de novedad. Los tamaños son los del [sidebar compacto](../equipos-sidebar-compacto/README.md), también elegido por ella; en la maqueta de esta carpeta se ven los anteriores y faltan los íconos y el botón de contraer del sidebar, que **se mantienen**. Solo diseño, solo web del coach. Contrastada con `origin/main` (a9d46b4). Maqueta que se puede probar en [calendario.html](calendario.html); capturas en `capturas/`. La maqueta usa los estilos reales de la web; las pantallas existentes conservan su forma actual. El panel y el teléfono son una representación: el panel mantiene el componente actual (`RoutinePanel`).

## Pedido de la usuaria (trasladado por Desarrollo general, 26-11)

> «necesito agregar algo que se me paso y es que agregar ciclos debe estar dentro del calendario principal de los equipos, y el panel para asignar sesiones debe ser por arrastre tal cual como esta en el de atletas»

## Diseño

**El Calendario sigue siendo el calendario**, con sus vistas Mes y Semana, y suma a la derecha el mismo panel de rutinas arrastrable de la ficha del atleta. No se reemplaza por la pizarra por semanas.

Como el equipo tiene **un solo ciclo por fechas**, soltar en un día no deja dudas sobre a qué ciclo va.

### 1. Dónde se suelta

- **Mes:** en la casilla del día.
- **Semana:** en una fila nueva, **«Plan del equipo»**, arriba de los atletas. Las filas de atletas no reciben rutinas: muestran quién hizo qué. Para cambiar lo de una persona se entra a su ficha, como se decidió el 25-11.
- Los días del ciclo llevan una línea azul arriba. Sobre la cuadrícula: nombre del ciclo, fechas, «N de M atletas» y «Ver ciclo». Si en lo que se ve hay dos ciclos, aparece una línea de estos datos por cada uno.
- Mientras se arrastra: «Soltar aquí» en los días válidos.
- Al soltar se guarda solo, con «Guardado», el aviso «“Zona media” agregada el lunes 30: llega a 10 atletas.» y **Deshacer**, igual que en la pizarra.

### 2. Días que no aceptan rutinas

| Caso | Qué pasa |
|---|---|
| Día pasado | «Día pasado»; no se suelta |
| Día sin ciclo del equipo | «Sin ciclo»; no se suelta. Igual que «Fuera del ciclo» en la pizarra del atleta. No se abre ningún flujo al soltar |
| Equipo sin ciclo | Aviso sobre el calendario con «Agregar ciclo»; las rutinas se ven apagadas |
| Viendo a una persona | El panel explica que hay que elegir «Todas las personas» o abrir su ficha |
| Filtro que oculta las sesiones | El panel pide mostrar las sesiones |
| Ciclo sin atletas | Se puede planificar; el aviso dice que llega a 0 atletas |

### 3. «Agregar rutina»

**Se quita del Calendario** y su lugar lo toma **«Agregar ciclo»**, que abre la ventana actual de ciclo nuevo. Hoy «Agregar rutina» agrega a varios atletas fuera del ciclo del equipo; tener dos formas con resultados distintos en la misma pantalla confunde. «Agregar a varios atletas» **sigue en la Biblioteca**.

Después de crear el ciclo, el calendario se mueve a su primer mes o semana y avisa que ya se pueden arrastrar rutinas.

### 4. Herramienta «Ciclos»

**No cambia:** conserva la pizarra por semanas, «Datos del ciclo», «Quién lo recibe» y su «Agregar ciclo». «Ver ciclo» del calendario la abre en el ciclo correspondiente.

### Sesiones en el calendario

- **Del plan del equipo:** se pueden arrastrar a otro día del mismo ciclo y tienen «⋯» con el menú de la pizarra: Editar ejercicios, Mover, Duplicar y Quitar. Las pasadas no se mueven. Muestran «Llega a N» o «N de M», y «N ajustada» si corresponde.
- **Propias de cada atleta:** como hoy, con «Ciclo propio». No se arrastran.
- Las copias de las sesiones del equipo, incluidas las ajustadas, **no deben repetirse** como tarjetas de cada atleta.
- Eventos del equipo y actividades de atletas: sin cambios.

### 5. Sin arrastrar: teclado y teléfono

- **«+» en cada día válido** abre la lista de rutinas, como en la pizarra.
- **Teclado:** Enter o Espacio sobre una rutina abre «Agregar el…» con los días válidos de los ciclos. Mover y duplicar se hacen desde «⋯». El resultado se anuncia.
- **Bajo 1100 px:** el panel se abre con el botón «Rutinas». Entre 1101 y 1280 px las casillas quedan angostas; el panel lateral de Equipos se puede contraer.
- **Teléfono (hasta 720 px):** sin arrastre. El plan del equipo es una lista de siete días con «+». El seguimiento por atleta sigue debajo, como hoy (no aparece en la maqueta).

### 6. Ficha de novedad

**Sí lleva:** `coach-team-calendar@1`, solo coach web, 1 slide con animación de una rutina que se arrastra a un día.

- Título: «Arma el plan desde el calendario»
- Texto: «Crea el ciclo del equipo y arrastra rutinas a sus días: llegan a quienes lo reciben.»

Se puede ver al final de la maqueta. Con «reducir movimiento», la animación queda quieta.

## Para Desarrollo

- El calendario necesita el detalle de **todos los ciclos del equipo que crucen el rango visible**, no solo uno, y resolver el ciclo según el día.
- Conviene compartir la lógica de guardar, deshacer, mensajes y menú con `TeamBoard`, para que las dos pantallas se comporten igual.
- Mover o duplicar desde el calendario ofrece días del mismo ciclo.
- Agrupar las sesiones propias sin incluir las copias del ciclo del equipo. Según Desarrollo general (26-11, revisado en el esquema, **sin probar**), se distinguen: el ciclo del atleta tiene `teamCycleId` y la sesión copiada, `teamSessionId`. Hay que conservar de qué ciclo viene cada sesión, porque hoy el calendario junta las de todos, y tratar aparte las copias del ciclo de otro equipo si la persona está en dos.
- No parece requerir cambios en la base. Sin verificar en la API.

## Cambia respecto de lo aprobado antes

`docs/diseno/equipos-sidebar` ponía «Agregar rutina» en el Calendario y `docs/diseno/ciclo-del-equipo` ponía la planificación en Ciclos. Esta propuesta suma la planificación al Calendario sin quitarla de Ciclos.

## Verificación

Probada en un navegador automatizado: soltar, deshacer, mover una sesión, rechazo en día pasado y sin ciclo, «+», fila del plan en Semana, rechazo en filas de atletas y persona filtrada. No se probó en un teléfono ni en una tableta reales. En la maqueta, el menú, la ventana de ciclo nuevo y el selector de día por teclado son simulados.
