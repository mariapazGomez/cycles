---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: approved
tags: [diseno, biblioteca, rutinas, ciclos, coach]
created: 2026-10-27
updated: 2026-10-27
---

# Biblioteca del coach

> **Diseño aprobado el 2026-10-27, sin construir.** Reemplaza las pestañas **Ciclos** y **Rutinas** del coach por una sola, **Biblioteca**, y suma un «+» visible en cada día del calendario del ciclo, que vive en la **pestaña del atleta**, no en la Biblioteca. La Biblioteca es además la fuente de material que más adelante podrá consultar el agente; hoy es solo una lista y no se menciona IA en la interfaz (ver [[marca-personal-storytelling]]: la IA es horizonte, no producto).

## Cómo verla

Abre [`propuestas.html`](propuestas.html) en el navegador. Es una maqueta de un solo archivo con cuatro controles arriba: **Pantalla** (Biblioteca o Atleta: calendario del ciclo), **Variante** (A filas o B tarjetas, solo en la Biblioteca), **Estado** (con datos, vacío, cargando, error) y **Ancho** (escritorio o celular). Los nombres y las cifras son de ejemplo.

## Decisiones ya tomadas (2026-10-27)

1. **Una sola lista con filtros**: **Todo, Rutinas, Ciclos**, cada uno con su conteo, y un buscador por nombre. **Variante A, filas** (elegida; la B, tarjetas, queda descartada).
2. **Se distinguen por ícono y color:**
   - Rutina: mancuerna sobre azul pálido.
   - Ciclo: anillo (el isotipo) sobre tinta oscura.
   - Cada fila lleva además la etiqueta «Rutina» o «Ciclo» para no depender solo del color.
3. **Ejercicios:** entrarán solo los **personalizados** del coach, no los 54 del catálogo global. Hasta que exista la pestaña de ejercicios (CYC-56), el filtro no aparece.
4. **Ciclo aislado:** desde la Biblioteca se puede crear un ciclo sin atleta, que funciona como **plantilla**. Se asigna después a un atleta, y la asignación crea una **copia** (el ciclo copiado apunta a la plantilla con `templateId`).
5. **«+» en cada día** del calendario del ciclo, siempre visible, como en la referencia de TrainerPlan. Cada día del ciclo es un cuadro.
6. **Más de una sesión por día: sí.** El «+» tenue en un día ocupado agrega otra sesión ese mismo día.
7. **«Sesiones por semana» es una guía, no un tope.** Se muestra en el resumen de la semana («2 de 4 planificadas») y la sesión se ubica por su fecha. Antes de construirlo hay que comprobar cómo la app móvil lee «Hoy» y el calendario.
8. **El calendario vive en la pestaña del atleta** (Atletas), no en la Biblioteca. La Biblioteca solo lista y crea; el trabajo sobre los días de un ciclo se hace en el atleta.

## Pantalla 1: Biblioteca

- Encabezado con el título y el botón **Crear**, que abre un menú con **Rutina** y **Ciclo**.
- **Variante A, filas:** una fila por elemento con el ícono, el nombre, el atleta (si el ciclo lo tiene) y etiquetas separadas: tipo, grupos musculares, «Plantilla» o estado, y las cifras (ejercicios y series, o semanas y sesiones por semana). Acciones a la derecha: Editar y Borrar en las rutinas; Asignar a un atleta y Editar en las plantillas; **Ver en el atleta** en los ciclos que ya tienen atleta (lleva a la pestaña del atleta, con ese ciclo seleccionado).
- **Variante B, tarjetas (descartada):** el mismo contenido en una grilla de tarjetas. Se deja en la maqueta solo como referencia.
- **Elegida: A.** Con muchos elementos escanear una columna es más rápido, y se parece a la lista actual de Rutinas.
- Sin subtítulos grises ni líneas «X · Y · Z»: los datos van como etiquetas independientes.
- **Estados:** vacío (invita a crear una rutina primero), cargando (esqueletos con la forma final) y error con **Reintentar**.
- **Celular:** el buscador pasa a su propia línea y las acciones bajan a una fila bajo cada elemento.

## Pantalla 2: pestaña del atleta, con el calendario del ciclo

Hoy el calendario está en una página aparte (`/cycles/:id`) y la pestaña del atleta (`/athletes/:id`) muestra solo el resumen. Se propone unirlos: el atleta pasa a tener dos vistas, **Ciclo** (la de entrada) y **Resumen**. Parte del calendario ya implementado ([[ciclo-en-calendario]]) y cambia esto:

- **Encabezado del atleta:** «← Atletas», el avatar, el nombre y el botón **Asignar ciclo de la Biblioteca**.
- **Selector de ciclo:** un menú con los ciclos del atleta (el activo primero). El «+» actúa siempre sobre el ciclo seleccionado. Junto al selector van el estado, el tipo y **Editar ciclo**.
- **Un cuadro por cada día del ciclo**, de lunes a domingo, con el «+» arriba a la izquierda y el número del día arriba a la derecha. Hoy se resalta en azul pálido.
- **Tocar el «+»** abre el panel de asignar sobre la grilla, sin modal: la rutina, «Repetir este día en las semanas que siguen vacías», **Asignar** y **Cancelar**. El botón queda azul mientras el panel está abierto.
- **Resumen por semana** con las sesiones planificadas frente a las que sugiere el ciclo («2 de 4 planificadas»). Pasa a ser una guía, no un tope.
- Un día que ya tiene sesión muestra un «+» más pequeño y tenue, para agregar otra.
- **Celular** (y ventanas de menos de 900 px): cada semana es una lista de los siete días, cada uno con su «+» al extremo derecho.
- La vista **Resumen** conserva lo de hoy (carga semanal, adherencia y ejercicios) y no se rediseña aquí.

## Pendientes de construcción

- **Modelo de sesiones:** hoy cada sesión se ubica por semana y espacio (`weekNumber` y `slotNumber`, con la regla de que el espacio no supere «sesiones por semana», más la restricción única por ciclo, semana y espacio). Para varias sesiones por día y sin tope hay que ubicarlas por fecha (`scheduledDate`), con el espacio asignado solo, y revisar la restricción única. Se decide en el PR 3 tras leer la app móvil.
- **Plantilla sin fechas:** se define por nombre, objetivo, número de semanas y sesiones por semana (la guía); la fecha de inicio se pide al asignarla. La plantilla **no lleva rutinas dentro**: las rutinas se ponen con el «+» en el calendario del atleta, ya con el ciclo asignado. Si más adelante se quiere una plantilla con rutinas ya puestas, habría que sumar un editor de plantillas.
- **Ruta del atleta:** el calendario pasaría de `/cycles/:id` a la pestaña del atleta, por ejemplo `/athletes/:id?ciclo=…`. `/cycles/:id` redirigiría ahí.

## Qué se construiría después (PR 2 y PR 3)

| PR | Qué | API y base de datos |
|---|---|---|
| 2 | `BibliotecaPage`, menú del coach (Inicio, Atletas, Biblioteca), redirección de `/routines` y `/cycles` para el coach, y enlaces «volver» y «crear» actualizados | Sin cambios |
| 3 | Pestaña del atleta con vistas Ciclo y Resumen y selector de ciclo, «+» por día, y ciclo plantilla | Migración que hace `athleteId` opcional, crear y asignar plantilla, y sesiones por fecha |

El atleta conserva «Mis ciclos» y la app móvil no cambia en el PR 2.
