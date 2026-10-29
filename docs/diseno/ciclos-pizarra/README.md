---
type: design
parent: "[[PRD-RutinasYProgramacion]]"
status: approved
tags: [diseno, ciclos, pizarra, calendario, coach]
created: 2026-10-28
updated: 2026-10-28
---

# Edición de ciclos como pizarra (CYC-172)

> **Diseño aprobado el 2026-10-28 (variante A). Construido el 2026-10-29** (CYC-178 el API; CYC-179 la web, en tres PR: pizarra base, creador rápido de rutinas y estados de ciclo). Los estados de ciclo terminado, completado y archivado, «Agregar una semana», «Marcar como completado» y «Reabrir» ya funcionan, y el API rechaza cambiar las sesiones de un ciclo que no está activo. El calendario del ciclo se convierte en una **pizarra**: el coach arrastra rutinas a los días, mueve, duplica y quita sesiones, y crea rutinas nuevas sin salir de la ventana. **Es solo para el coach**: el atleta sigue viendo su ciclo semana a semana, sin arrastrar ni editar.

## Cómo verla

Abre [`propuestas.html`](propuestas.html) en el navegador (maqueta de un solo archivo; los datos son de ejemplo). La barra negra de arriba tiene:

- **Pantalla:** Pizarra u Hoja de estados (todos los estados visuales juntos).
- **Variante:** A (panel lateral) o B (bandeja superior).
- **Ancho:** escritorio (1320 px) o tablet (820 px).
- **Pantalla en:** normal, arrastrando, guardando, error al guardar, cargando, falla de carga, sin rutinas, sin sesiones.
- **Ciclo:** en curso, terminó (sigue activo), completado, archivado.
- **Abrir:** datos del ciclo, el «+» de un día, el menú de una sesión, crear rutina y detalles del ejercicio.

En «Normal» la maqueta funciona de verdad: arrastra una rutina a un día, arrastra una sesión pendiente a otro día, usa el «+» o el menú ⋯, y prueba **Deshacer**. Los controles de la maqueta no son parte del producto.

## Decisiones tomadas (2026-10-28)

0. **Variante A (panel lateral).** La B queda descartada y se deja en la maqueta solo como referencia.

1. **La pizarra reemplaza la vista Ciclo** de la ficha del atleta (`/athletes/:id`), donde ya vive el calendario desde CYC-171. El panel de rutinas vive dentro de esa vista.
2. **Autoguardado.** Cada gesto (soltar, mover, duplicar, quitar) se guarda al instante. Un indicador en el encabezado dice **Guardando… / Guardado / No se guardó (Reintentar)**, y cada cambio trae un aviso con **Deshacer** por 6 segundos. No hay botón Guardar.
3. **Creador rápido de rutinas** en un cajón lateral, con lo mínimo (nombre, ejercicios, series y repeticiones). **Cualquier especificación adicional (peso, descanso, repeticiones en reserva) se captura en una ventana emergente** «Detalles del ejercicio», con los mismos campos y etiquetas del editor de rutinas de la web. Un enlace «Abrir en el editor completo» queda para todo lo demás. Un botón «Agrupar en bloque» deshabilitado con la etiqueta «Pronto» reserva el lugar de las superseries (CYC-108 y CYC-109).

4. **Quitar una sesión es un borrado lógico.** La sesión se marca como quitada y deja de verse, pero no se destruye: **Deshacer** la restaura con todos sus ajustes de ejercicios. Una sesión quitada no aparece en ninguna lista (calendario del coach, «Hoy» y la app del atleta, seguimiento, avisos); su purga definitiva queda para la construcción (propuesta: pasadas 24 horas).
5. **Las sesiones solo se pueden asignar a hoy o a los días siguientes del ciclo.** Asignar una sesión a un día que ya pasó no tiene sentido, así que todo día anterior a hoy sale con la etiqueta «Día pasado», sin «+», y no acepta soltar ni mover (vale para crear, mover y duplicar). Si el ciclo ya terminó y sigue activo, todos sus días son pasados; para seguir planificando, el coach usa «Agregar una semana» o marca el ciclo como completado. Las sesiones que ya estaban en días pasados (hechas, omitidas o sin hacer) se quedan donde están y se pueden consultar; las pendientes se pueden quitar, duplicar a un día vigente o mover a hoy o más adelante.
6. **En tablet y táctil se edita con el «+» y el menú ⋯**; no se construye arrastre con el dedo. El arrastre es solo para ratón.

## La pantalla

**Tres zonas.**

1. **Centro: el calendario**, protagonista. Semanas en filas y días en columnas (lógica actual). Cada día tiene un «+» siempre visible; si ya tiene sesiones, el «+» es más pequeño y tenue para sumar otra.
2. **Rutinas**: lista con buscador y «Crear rutina nueva» (según la variante).
3. **Encabezado compacto**: «← Atletas», avatar, nombre, selector de ciclo, estado, tipo, fechas, indicador de guardado, «Datos del ciclo» y las vistas Ciclo y Resumen. El formulario de nombre, objetivo, inicio, fin y estado **ya no ocupa la parte principal**: se abre bajo demanda.

### Variantes

| | **A · Panel lateral** | **B · Bandeja superior** |
|---|---|---|
| Rutinas | Panel fijo a la derecha, con buscador y botón primario «Crear rutina nueva» | Fila horizontal sobre el calendario, con buscador y una tarjeta «Crear rutina nueva» |
| Calendario | Columnas de ~118 px: todas las semanas visibles; nombres de hasta 2 líneas | Ancho completo, columnas de ~155 px |
| Muchas rutinas | Lista vertical con buscador: escala bien | La fila se desplaza de lado: se ve una parte |
| Datos del ciclo | Popover desde el botón | Panel plegable bajo el encabezado (empuja el calendario hacia abajo) |
| Tablet | El panel pasa a una hoja que se abre con el botón «Rutinas» | La bandeja se mantiene arriba |

**Recomendación: A.** Se parece a la lista de la Biblioteca (filas), escala mejor con muchas rutinas y no empuja el calendario cuando se abre un panel. B da más ancho al calendario pero esconde parte de las rutinas y, al abrir «Datos del ciclo», deja el calendario fuera de pantalla.

## Interacciones

| Interacción | Cómo funciona |
|---|---|
| **Arrastrar una rutina a un día** | Crea la sesión en ese día. El día destino se resalta en azul con «Soltar aquí». |
| **Sin arrastrar** | El «+» de cada día abre un popover con buscador de rutinas; elegir una la agrega. Funciona con teclado y táctil. Cada rutina del panel también se activa con Enter. |
| **Mover una sesión** | Arrastrarla a otro día o semana, o menú ⋯ → «Mover a otro día…» (elige semana y día). |
| **Duplicar** | Menú ⋯ → «Duplicar en otro día…». |
| **Quitar** | Menú ⋯ → «Quitar de este día». Sin confirmación bloqueante: se quita (borrado lógico) y aparece el aviso con **Deshacer**, que la restaura. |
| **Varias sesiones por día** | Se apilan en la celda en el orden en que se agregaron. El «+» pequeño agrega otra. |
| **Soltar fuera del ciclo** | Los días fuera de Inicio–Fin salen rayados («Fuera del ciclo») y, al arrastrar, se tiñen de rosa y no aceptan la sesión. Cualquier día anterior a hoy es «Día pasado» y tampoco acepta sesiones (en un ciclo que ya terminó, todos sus días lo son). |
| **Otra semana** | Botón «Agregar una semana» bajo el calendario: mueve el fin del ciclo 7 días (avisa la nueva fecha) y tiene Deshacer. |
| **Sesión hecha** | Bloqueada: no se arrastra, no tiene menú y su aviso dice «Ya se registró: no se puede mover ni quitar». |
| **Sesión omitida** | No se mueve (lleva el cierre del atleta): solo se **duplica** a un día vigente o se **quita** (queda oculta). Decisión del 2026-10-28, CYC-178. |
| **Crear rutina** | «Crear rutina nueva» abre el cajón (no cambia de página). «Guardar y usar» la agrega a la lista, lista para arrastrar. |
| **Editar una rutina** | Se abre en el mismo cajón desde la rutina (queda para la construcción: la maqueta muestra el caso de crear). |
| **Detalles de un ejercicio** | En el cajón, «Detalles…» abre la ventana emergente con series, repeticiones (obligatoria), peso (kg), descanso (s) y repeticiones en reserva objetivo. |

### Creador rápido y ventana de detalles

- **Cajón:** nombre de la rutina; lista de ejercicios, cada uno con **series** (− +) y **reps** al paso, la etiqueta «Con detalles» cuando tiene peso, descanso o RIR, y el botón «Detalles…»; «Agregar ejercicio» abre un buscador con filtros por grupo muscular. Pie: «Guardar y usar», «Cancelar» y «Abrir en el editor completo».
- **Ventana «Detalles del ejercicio»:** Series (− +), Repeticiones (obligatoria: si se vacía, el campo se marca en rosa con «Indica cuántas repeticiones»), Peso en kg (vacío = peso corporal), Descanso en segundos y Reps en reserva objetivo («Sin objetivo», 0 a 3 y «4 o más»). Son los mismos campos y textos del editor de rutinas de la web. Escape o «Cancelar» cierran sin guardar.
- **Notas del coach por ejercicio** (CYC-60) tendrán su lugar en esta ventana cuando exista; no se dibuja ahora.

## Estados

La pestaña **Hoja de estados** de la maqueta junta todos los estados visuales con los mismos patrones de la web:

- **Sesión:** Pendiente (blanca), **Hecha** (verde, insignia de visto, esfuerzo y minutos; bloqueada), Hecha con dolor, **Omitida** (ámbar), **Día tentativo** (borde punteado), arrastrando (origen tenue con borde azul punteado), guardando (anillo azul y spinner) y no se guardó (rosa con «Reintentar»).
- **Día:** vacío, con una sesión, con varias, hoy, destino válido, destino inválido, fuera del ciclo y solo lectura.
- **Guardado:** Guardado, Guardando…, No se guardó y el aviso Deshacer.
- **Pantalla:** cargando (esqueletos con la forma final), falla de carga con «Reintentar», sin rutinas (invita a crear la primera), sin sesiones (aviso «Ciclo nuevo») y error al guardar (franja rosa con «Reintentar» y «Descartar el cambio»).

### Qué se puede editar según el estado del ciclo

| Estado | Cómo se ve | Sesiones | Fechas y datos |
|---|---|---|---|
| **Activo, en curso** | Pizarra completa; los días anteriores a hoy salen como «Día pasado» | Agregar, mover y duplicar a hoy o a días siguientes; quitar las que no están hechas | Editables |
| **Activo, ya terminó** | Franja ámbar: «El ciclo terminó el 20 nov, pero sigue marcado como Activo»; todos los días son «Día pasado» | Se pueden quitar las pendientes y duplicarlas o moverlas a un día vigente, pero no agregar ni mover a días pasados | Botones «Marcar como completado» y «Agregar una semana» |
| **Completado** | Solo lectura; franja azul con «Reabrir ciclo» | Ninguna acción | Solo consultar |
| **Archivado** | Solo lectura; franja azul con «Reactivar ciclo» | Ninguna acción | Solo consultar |

Esto resuelve la incoherencia de hoy, donde el banner dice «El ciclo terminó» aunque el estado sea Activo.

## Accesibilidad

- Todo se puede hacer **sin arrastrar** (el «+», el menú ⋯ y Enter sobre una rutina). En tablet y táctil el arrastre HTML5 no funciona, así que esas rutas son la vía principal.
- Foco visible (anillo azul de 2 px) en botones, tarjetas y campos; Escape cierra popovers, cajón y ventana; cajón y ventana usan `role="dialog"` y `aria-modal`.
- Las sesiones tienen texto («Hecha», «Omitida», «Día tentativo»), no solo color. Las tarjetas y botones traen etiquetas (`aria-label`) con día y estado.
- Los colores salen de los tokens de la web. **Contraste medido el 2026-10-29** sobre la pizarra construida (texto 4.5:1 y componentes 3:1, WCAG AA): todo el texto cumple, de 4.67:1 (la etiqueta «Esta semana») a 15.9:1; las franjas de aviso van de 5.65:1 a 7.02:1 y «Soltar aquí» da 5.27:1. El borde de los «+» da 3.05:1; el «+» tenue (el de los días que ya tienen sesión) tenía el borde en 1.30:1 y se subió al mismo color de control. **Foco de teclado:** recorrido con Tab por la pizarra, todos sus controles muestran un anillo azul de 2 px con 5.9:1. Los «+» tienen 24 px (objetivo táctil mínimo de WCAG 2.2).
- La animación del spinner y de los esqueletos se apaga con «reducir movimiento».

## Capturas

| Pantalla | Archivo |
|---|---|
| Variante A, escritorio | [`01-variante-a-normal.jpg`](capturas/01-variante-a-normal.jpg) |
| Variante B, escritorio | [`02-variante-b-normal.jpg`](capturas/02-variante-b-normal.jpg) |
| Arrastrando: destino válido, destino inválido y origen | [`03-arrastrando.jpg`](capturas/03-arrastrando.jpg) |
| «+» de un día (sin arrastrar) | [`04-agregar-con-mas.jpg`](capturas/04-agregar-con-mas.jpg) |
| Menú de una sesión | [`05-menu-de-sesion.jpg`](capturas/05-menu-de-sesion.jpg) |
| Crear rutina (cajón) | [`06-crear-rutina.jpg`](capturas/06-crear-rutina.jpg) |
| Detalles del ejercicio (ventana emergente) | [`07-detalles-del-ejercicio.jpg`](capturas/07-detalles-del-ejercicio.jpg) |
| Datos del ciclo, A (popover) y B (panel) | [`08`](capturas/08-datos-del-ciclo-a.jpg) · [`09`](capturas/09-datos-del-ciclo-b.jpg) |
| Tablet, A (con la hoja de rutinas) y B | [`10`](capturas/10-tablet-a.jpg) · [`11`](capturas/11-tablet-b.jpg) |
| Ciclo que terminó y ciclo completado | [`12`](capturas/12-ciclo-termino.jpg) · [`13`](capturas/13-ciclo-completado.jpg) |
| Error al guardar, sin rutinas y sin sesiones | [`14`](capturas/14-error-al-guardar.jpg) · [`15`](capturas/15-sin-rutinas.jpg) · [`16`](capturas/16-sin-sesiones.jpg) |
| Hoja de estados | [`17-hoja-de-estados.jpg`](capturas/17-hoja-de-estados.jpg) |

**Móvil** (solo se indica qué se degrada): la pizarra no se edita en celular. Se mantiene la lista por semana con los siete días y su «+» (CYC-171), sin panel de rutinas ni arrastre; las acciones de mover, duplicar y quitar salen del menú ⋯ de cada sesión.

## Preguntas abiertas

Las cuatro primeras se cerraron el 2026-10-28 (ver «Decisiones tomadas»). Quedan para la construcción:

1. **Duplicar una sesión ajustada:** **resuelta (2026-10-28):** copia la sesión tal como quedó, con sus ejercicios modificados.
2. **Editar una rutina desde la pizarra:** **resuelta (2026-10-29, PR 2):** se abre el mismo cajón con la rutina cargada; cambiarla afecta solo a las sesiones que se agreguen desde ahora.
3. **Purga del borrado lógico:** **resuelta (CYC-178):** 24 horas, sin tarea programada (al quitar otra sesión del mismo ciclo se destruyen las quitadas hace más de 24 h que no tengan series ni cierre).

## Qué cambia para construirlo (solo la lista; nada de esto está hecho)

**API**

- **Mover una sesión:** hoy `PATCH /sessions/:id` no cambia la semana ni reordena los espacios. Debe aceptar una nueva `scheduledDate`, recalcular la semana y repartir los espacios con la misma regla que la creación por día (`reassignSlots`). **Hecho (CYC-178, PR #98):** solo mueve sesiones pendientes sin series ni cierre.
- **Quitar una sesión (borrado lógico):** hoy `DELETE /sessions/:id` responde 409 si tiene ejercicios. Se agrega un campo `deletedAt` en la sesión: quitar lo marca, **Deshacer** lo limpia (p. ej. `POST /sessions/:id/restore`) y todas las consultas lo excluyen (calendario del coach, `/me/today`, seguimiento, avisos y resumen de actividad). Una tarea programada purga las sesiones quitadas pasado el tiempo definido. Hace falta una migración.
- **Proteger las sesiones hechas en el servidor:** rechazar mover o borrar una sesión con registro vigente (confirmar si ya ocurre y cubrirlo con pruebas). **Hecho (CYC-178, PR #98):** 409 si está completada o tiene series; la omitida se puede quitar.
- **Duplicar:** crear con `POST /cycles/:id/sessions` (rutina y fecha) ya sirve; copiar una sesión ajustada pide un endpoint nuevo, p. ej. `POST /sessions/:id/duplicate` con la fecha destino.
- **Agregar una semana:** `PATCH /cycles/:id` con una nueva `endDate` ya existe.
- **Crear rutina rápida:** `POST /routines` ya acepta los ejercicios con series, repeticiones, peso, descanso y RIR por defecto.

**Web**

- Reemplazar `CycleCalendarView` y `PlanCalendar` por la pizarra; el panel de rutinas, el creador en cajón y la ventana de detalles son componentes nuevos, reutilizando el selector de ejercicios del editor de rutinas.
- Un solo lugar para las operaciones (agregar, mover, duplicar, quitar) con su función inversa para «Deshacer» y el indicador de guardado, apoyado en react-query (actualización optimista con reversión si falla).
- Arrastrar y soltar: HTML5 nativo para ratón. En táctil se usa el «+» y el menú ⋯ (decidido).
- Un cambio de estado del ciclo («Marcar como completado», «Reabrir») usa `PATCH /cycles/:id` con `status`.

## Fuera de alcance

Construir la funcionalidad, cambiar la API, modo oscuro, la vista móvil completa y las superseries (solo se deja el espacio en el creador).

## Relación con otras tareas

- [[biblioteca]] (CYC-163): el panel de rutinas repite la fila de la Biblioteca (ícono de rutina, nombre, grupos y número de ejercicios).
- [[ciclo-en-calendario]]: se conservan los estados y la jerarquía visual de las tarjetas.
- CYC-108 y CYC-109 (superseries y constructor por bloques): el creador deja el espacio sin rehacerse.
- CYC-166 y CYC-171: la API de sesiones por día y la ficha del atleta con el calendario ya existen.
