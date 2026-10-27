---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: proposed
tags: [diseno, biblioteca, rutinas, ciclos, coach]
created: 2026-10-27
updated: 2026-10-27
---

# Biblioteca del coach

> **Propuesta, sin construir.** Reemplaza las pestañas **Ciclos** y **Rutinas** del coach por una sola, **Biblioteca**, y suma un «+» visible en cada día del calendario del ciclo. La Biblioteca es además la fuente de material que más adelante podrá consultar el agente; hoy es solo una lista y no se menciona IA en la interfaz (ver [[marca-personal-storytelling]]: la IA es horizonte, no producto).

## Cómo verla

Abre [`propuestas.html`](propuestas.html) en el navegador. Es una maqueta de un solo archivo con cuatro controles arriba: **Pantalla** (Biblioteca o Calendario del ciclo), **Variante** (A filas o B tarjetas, solo en la Biblioteca), **Estado** (con datos, vacío, cargando, error) y **Ancho** (escritorio o celular). Los nombres y las cifras son de ejemplo.

## Decisiones ya tomadas (2026-10-27)

1. **Una sola lista con filtros** (opción A de la conversación): **Todo, Rutinas, Ciclos**, cada uno con su conteo, y un buscador por nombre.
2. **Se distinguen por ícono y color:**
   - Rutina: mancuerna sobre azul pálido.
   - Ciclo: anillo (el isotipo) sobre tinta oscura.
   - Cada fila lleva además la etiqueta «Rutina» o «Ciclo» para no depender solo del color.
3. **Ejercicios:** entrarán solo los **personalizados** del coach, no los 54 del catálogo global. Hasta que exista la pestaña de ejercicios (CYC-56), el filtro no aparece.
4. **Ciclo aislado:** desde la Biblioteca se puede crear un ciclo sin atleta, que funciona como **plantilla**. Se asigna después a un atleta, y la asignación crea una **copia** (el ciclo copiado apunta a la plantilla con `templateId`).
5. **«+» en cada día** del calendario del ciclo, siempre visible, como en la referencia de TrainerPlan. Cada día del ciclo es un cuadro.

## Pantalla 1: Biblioteca

- Encabezado con el título y el botón **Crear**, que abre un menú con **Rutina** y **Ciclo**.
- **Variante A, filas:** una fila por elemento con el ícono, el nombre, el atleta (si el ciclo lo tiene) y etiquetas separadas: tipo, grupos musculares, «Plantilla» o estado, y las cifras (ejercicios y series, o semanas y sesiones por semana). Acciones a la derecha: Editar y Borrar en las rutinas; Asignar a un atleta y Abrir en las plantillas; Abrir en los ciclos de un atleta.
- **Variante B, tarjetas:** el mismo contenido en tarjetas de una grilla, con el ícono y el tipo arriba. Ocupa más espacio y se lee menos como lista, pero muestra mejor el nombre completo.
- **Recomendación:** A. Con muchos elementos escanear una columna es más rápido, y coincide con la lista actual de Rutinas que el coach ya conoce.
- Sin subtítulos grises ni líneas «X · Y · Z»: los datos van como etiquetas independientes.
- **Estados:** vacío (invita a crear una rutina primero), cargando (esqueletos con la forma final) y error con **Reintentar**.
- **Celular:** el buscador pasa a su propia línea y las acciones bajan a una fila bajo cada elemento.

## Pantalla 2: calendario del ciclo con «+» en cada día

Parte del calendario ya implementado ([[ciclo-en-calendario]]) y cambia tres cosas:

- **Un cuadro por cada día del ciclo**, de lunes a domingo, con el «+» arriba a la izquierda y el número del día arriba a la derecha. Hoy se resalta en azul pálido.
- **Tocar el «+»** abre el panel de asignar sobre la grilla, sin modal: la rutina, «Repetir este día en las semanas que siguen vacías», **Asignar** y **Cancelar**. El botón queda azul mientras el panel está abierto.
- **Resumen por semana** con las sesiones planificadas frente a las que sugiere el ciclo («2 de 4 planificadas»). Pasa a ser una guía, no un tope.
- Un día que ya tiene sesión muestra un «+» más pequeño y tenue, para agregar otra.
- **Celular:** cada semana es una lista de los siete días, cada uno con su «+» al extremo derecho.

## Preguntas abiertas

- **¿Dos sesiones el mismo día?** El «+» tenue en un día ocupado lo permite. Si la respuesta es no, ese «+» se quita en los días con sesión. Hoy el modelo ubica cada sesión por semana y espacio (`weekNumber` y `slotNumber`), no por día, y rechaza espacios mayores que «sesiones por semana».
- **¿Qué pasa con «sesiones por semana»?** Recomendación: pasa a ser una guía visible en el resumen, y la sesión se ubica por su fecha (`scheduledDate`) con el espacio asignado solo. Antes de construirlo hay que comprobar cómo la app móvil lee «Hoy» y el calendario.
- **Plantilla sin fechas:** se define por número de semanas y sesiones por semana, y la fecha de inicio se pide al asignarla. Lleva dentro sus rutinas, ubicadas por día relativo (día 1, día 3…).

## Qué se construiría después (PR 2 y PR 3)

| PR | Qué | API y base de datos |
|---|---|---|
| 2 | `BibliotecaPage`, menú del coach (Inicio, Atletas, Biblioteca), redirección de `/routines` y `/cycles` para el coach, y enlaces «volver» y «crear» actualizados | Sin cambios |
| 3 | Ciclo plantilla y «+» por día | Migración que hace `athleteId` opcional, crear y asignar plantilla, y sesiones por fecha |

El atleta conserva «Mis ciclos» y la app móvil no cambia en el PR 2.
