---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: implemented
tags: [diseno, ciclo, calendario, inicio, coach]
created: 2026-10-23
updated: 2026-10-27
---

# Ciclo en calendario y nuevo Inicio del coach

> **Implementado en la web** (2026-10-27): el detalle del ciclo del coach (`/cycles/:id`) usa el calendario y el Inicio del coach usa el tablero «Esta semana». Reemplaza a la cadena de semanas (opción B) en esa pantalla. Decisiones que se tomaron al construirlo están al final, en «Cómo quedó construido». Lo de abajo es la propuesta original.
>
> Propuesta original: Parte del calendario y de los planes de [[trainerplan|TrainerPlan]] para dibujar un ciclo como semanas de lunes a domingo, y de ahí deriva una visión nueva del Inicio del coach. Se suma a la decisión de [[grilla-del-plan|la grilla del plan]] (la cadena de semanas, opción B, sigue siendo la oficial): esta sería una tercera forma de ver el mismo ciclo.

## Cómo verla

Abre [`propuestas.html`](propuestas.html) en el navegador. Es una maqueta interactiva de un solo archivo con dos pantallas, **Ciclo del atleta** e **Inicio del coach**, y tres estados, **En curso**, **Recién creado** y **Cargando** (para ver los esqueletos de carga). Los nombres y las cifras son de ejemplo. El "hoy" de la maqueta está fijo en el viernes 23 de octubre de 2026.

## Qué se toma de TrainerPlan

Visto en el recorrido de onboarding como entrenador (pestañas Grupos y Planes, y el dashboard "Hoy"):

| Patrón de TrainerPlan | Cómo queda en Cycles |
|---|---|
| Calendario de lunes a domingo con la sesión puesta en su día | Cada semana es una tarjeta con siete columnas; la sesión aparece en el día que le toca |
| Totales al final de cada semana (tiempo y distancia) | Resumen por semana en fuerza: sesiones hechas de las planificadas, series y esfuerzo promedio |
| Vista de grupo: una fila por atleta, una columna por día | Es la base del **nuevo Inicio**: la semana de todos tus atletas en una sola tarjeta |
| Tarjetas "Hoy", "Se quedan sin plan" y "Sin actividad" | Se condensan en una tarjeta oscura "Hoy" y en la lista "Necesitan atención", que ya existe |
| Cuenta con datos de ejemplo | No se incluye aquí; se evalúa aparte |

## Qué se conserva de Cycles

- El lenguaje visual del Inicio del coach: fondo gris azulado, tarjetas con sombra suave y una tarjeta oscura arriba.
- La cadena de semanas como motivo ("cada ciclo construye el siguiente") en la tarjeta oscura.
- Los avisos del ciclo con el ajuste de carga ("Bajar 5 % desde semana 3") y "Descartar".
- El panel de asignar rutina inline, sin modal, con la casilla "Repetir en las semanas que siguen vacías". Aquí se repite en el mismo día de la semana.
- Cada celda con estado, "Esfuerzo 7", minutos y "Dolor" como datos separados, sin líneas con puntos medios.
- Textos en "tú", sin subtítulos grises bajo los títulos y sin emoji.

## Ciclo del atleta

Objetivo de esta versión: que el calendario se vea a primera vista, sin apretarlo. Una primera pasada lo compactó tanto que quedó incómodo de leer; esta versión busca el punto medio. En una pantalla de 1440 × 900 se ve entera la semana en curso y las dos siguientes, con textos de 12 a 15 px, celdas de unos 88 px de alto y 8 px entre ellas. Las demás semanas quedan a un desplazamiento.

- **Cabecera de una línea:** "Ciclos", el título, el atleta, el tipo y las fechas, y "Editar ciclo" a la derecha.
- **Franja de avance delgada:** "Semana 2 de 5", la cadena, "Esta semana lleva 2 de 3 sesiones" y "Ver resumen". Reemplaza la tarjeta oscura grande.
- **Aviso en una fila:** el dolor reportado, "Bajar 5 % desde semana 3" y "Descartar".
- **Una tarjeta por semana** sobre una grilla de columnas fijas (semana, lunes a domingo, resumen), con una sola cabecera de días que se queda fija al desplazarse.
- **Cada celda** muestra la rutina, el estado y, si está completada, "Esfuerzo 8" y los minutos. Las sesiones hechas ya no dicen "Completada": llevan un ícono de check (SVG, sin emoji) en un círculo verde y la tarjeta es verde con sombra interior, como hundida, para que se lea como un día que ya pasó. Lo mismo aplica a las etiquetas de las semanas plegadas, a las casillas del Inicio y a la leyenda. El ícono lleva su texto alternativo ("Completada") para lectores de pantalla. El número del día va en la esquina. Hoy tiene un anillo azul y la semana en curso queda destacada con un borde azul y más elevación.
- **Semanas pasadas plegadas** a una línea con una etiqueta por sesión ("Lun hecha", "Mié hecha, dolor", "Vie omitida"). Se despliegan tocando la semana.
- **Resumen al final de cada fila:** sesiones hechas de las planificadas, series y esfuerzo promedio.
- **Asignar rutina:** al tocar un día vacío aparece una fila sobre la grilla, sin modal, con la rutina, "Repetir los martes de las semanas vacías", "Asignar" y "Cancelar".
- **Celular:** cada semana pasa a una lista vertical con solo los días que tienen sesión.

### Profundidad

La primera versión se sentía plana. Ahora hay un lenguaje de elevación con tres niveles de sombra en capas y baja opacidad, sin gradientes ni brillos:

- **Reposo:** las tarjetas de semana, las celdas de sesión y los botones se despegan del fondo.
- **Destacado:** la semana en curso, el día de hoy y la franja de avance, que además lleva un filo claro arriba.
- **Flotante:** el panel de asignar rutina.
- **Interacción:** al pasar el cursor, las celdas y las tarjetas de atleta suben un poco y ganan sombra; al presionar, vuelven a su sitio.
- **Fondo de página** un poco más oscuro (`#eceff4`) para que las tarjetas blancas se despeguen. Es una propuesta; hoy el Design System usa `#f3f5f8`.
- **Colores de estado con sombra propia:** las celdas completadas y omitidas proyectan una sombra teñida de su color.

### Estados de carga

Mientras llegan los datos se muestran esqueletos con la forma final de cada pantalla (la franja, las semanas o las tarjetas de atletas), para que no haya una pantalla en blanco ni saltos de diseño al cargar. Pulsan con un cambio suave de opacidad (sin degradados). Al terminar, el contenido entra con un desplazamiento corto de 8 px y 220 ms. Con "reducir movimiento" activado no hay pulso ni entrada animada. El contenedor marca `aria-busy` mientras carga. Se ven al abrir la maqueta, al cambiar de pantalla y con el botón **Cargando**.

### Reglas que guiaron el ajuste

Se revisó con la heurística de diseño minimalista (cada elemento compite por atención) y con las reglas de oficio visual del proyecto:

- **Jerarquía según la tarea:** lo primero es el calendario; el avance y el aviso pasan a una fila cada uno.
- **Información a la vista:** el estado de cada sesión se lee sin abrir nada, con texto y color (el color solo no basta).
- **Espaciado en escala de 4 px** y números alineados en columnas con cifras tabulares.
- **Estados diseñados:** foco visible, hover, hoy, semana en curso, día vacío, cargando y ciclo recién creado.
- **Sin gradientes, sin brillos y transiciones solo sobre propiedades concretas.**

## Inicio del coach (derivado)

La semana de todos los atletas es lo principal y ocupa **todo el ancho**, sin barra horizontal: las columnas de los días se reparten el espacio disponible.

1. **Franja "Hoy":** cuántas sesiones hay hoy, cuántas están completadas y cuántos atletas necesitan atención.
2. **Una tarjeta por atleta**, separadas entre sí, con su nombre, su ciclo, sus sesiones en cada día y "2 de 3" al final. Es la vista de grupo de TrainerPlan, adaptada. Tocar un atleta lleva a su ciclo.
3. **Atención dentro de la tarjeta:** el motivo ("Dolor de hombro", "Omitió 1 sesión") aparece bajo el nombre y la tarjeta lleva un filo de color a la izquierda. Ya no hay una lista aparte. El botón **Necesitan atención** filtra la semana a esos atletas.
4. **Pantallas angostas:** cada tarjeta muestra sus siete días como una tira de casillas con una marca (hecha, omitida, pendiente), sin desplazamiento horizontal.

Qué resuelve respecto al Inicio actual: hoy el coach ve solo quién necesita atención. Con la semana en una tarjeta ve también quién no tiene nada planificado, quién va al día y quién se está quedando atrás, sin abrir cada ciclo.

## Impacto en datos y pendientes

- **Día de la semana:** una sesión hoy se ubica por `weekNumber` y `slotNumber`; `scheduledDate` es opcional. Para dibujar el calendario hace falta una fecha por sesión. Propuesta: al crear el ciclo, el coach elige sus días de entrenamiento (por ejemplo lunes, miércoles y viernes) y el sistema calcula las fechas a partir de la fecha de inicio. Si el atleta mueve una sesión, `scheduledDate` pasa a ser la fuente.
- **Series de la semana:** en la maqueta son las series completadas por semana; se pueden calcular con los registros de ejecución, que ya existen.
- **Inicio con muchos atletas:** con 50 o más atletas la tarjeta "Esta semana" necesita filtros (por grupo, por ciclo) y paginación. No se resuelve en esta maqueta.
- **Decisión abierta:** si el calendario reemplaza a la cadena de semanas, la complementa como vista alternativa (como se planteó para la matriz) o solo se usa en el Inicio.
- **Duplicar semana** sigue necesitando un endpoint nuevo, como en [[grilla-del-plan]].

## Cómo quedó construido

- **Qué día cae cada sesión.** Si la sesión tiene un día elegido (`scheduledDate`) y cae en esa semana, se usa ese. Si no, se usa un día por defecto según cuántas sesiones tiene la semana, contado desde el primer día de la semana del ciclo: 1 sesión, el día 1; 2, los días 1 y 4; 3, los días 1, 3 y 5; 4, los días 1, 2, 4 y 5; 5, de lunes a viernes. Todavía no se elige el día al crear el ciclo, así que el coach no puede moverlas; queda como mejora. Lo calcula `apps/web/src/lib/weekCalendar.ts`.
- **Encabezados de los días.** La semana de un ciclo empieza el día en que empieza el ciclo, así que los encabezados rotan si no empieza en lunes. En el Inicio, la semana es siempre de lunes a domingo.
- **Asignar rutina.** Sigue funcionando por semana y sesión, con el mismo endpoint; el panel ahora dice el día ("Asignar rutina el miércoles 21 oct").
- **Inicio del coach.** Cada atleta con ciclo activo pide sus sesiones de la semana por separado, así la lista aparece de inmediato y cada tarjeta se llena cuando llega. Los macrociclos usan los ciclos que contienen. Las acciones de los avisos (aplicar o descartar un ajuste) se conservan: al tocar el motivo bajo el nombre se abre la lista de avisos del atleta.
- **Atletas sin ciclo o con invitación pendiente.** Su tarjeta lo dice en vez de mostrar días.
- **Fondo de página.** Se dejó `#f3f5f8` (Design System); el `#eceff4` de la maqueta queda como propuesta.
- **Carga.** Esqueletos con la forma final en el ciclo y en el Inicio, con el aviso de que el servidor está despertando si tarda más de 4 segundos.
- **Ciclo terminado (2026-10-27).** Un ciclo cuyas semanas ya pasaron se abre con todas las semanas desplegadas; plegar todas dejaba el calendario sin días a la vista. Cada semana se sigue pudiendo plegar a mano, y en un ciclo activo las semanas pasadas siguen plegadas. La franja oscura «El ciclo terminó» ya no aparece: el estado queda en las etiquetas de arriba.
- **Días tentativos (2026-10-27).** Una sesión pendiente sin `scheduledDate` (o con una fuera de su semana) se dibuja con borde punteado y la etiqueta «Día tentativo», y el calendario lo explica en una línea sobre el encabezado. Deja de ser tentativa cuando tiene fecha. Las completadas y omitidas no se marcan.
