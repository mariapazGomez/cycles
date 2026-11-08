---
type: design
status: proposed
tags: [diseno, calendario, atleta, movil, web]
created: 2026-11-06
updated: 2026-11-06
---

# Actividades paralelas del atleta (CYC-237)

> **Contrastado con `origin/main` 9ad48ec.** Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta en [`propuestas.html`](propuestas.html) (se abre desde el disco). Desbloquea CYC-251 (API, ya en curso), CYC-252 (app móvil) y CYC-253 (web del coach).

## v2 (2026-11-06): más compacto y con vista de mes

La usuaria aprobó el flujo y pidió un diseño visual más compacto. Cambios: tarjetas de una línea (tile 22 px), márgenes de 4 a 6 px, hero del ciclo en una línea, hojas y formularios más bajos (texto ≥ 11 px, controles ≥ 32 px); **vista de mes completa** con el ícono de cada tipo en cada día, un punto por sesión del coach (oscuro = hecha, aro azul = pendiente), «+N» cuando no caben, detalle del día bajo la cuadrícula, flechas de mes y «Ir a hoy». Barra de dos controles: **Semana | Mes** y, en semana, **Ciclo | Fechas**. La web del coach también es compacta: celdas de 72 px, chips de 22 px y «Fuera del plan» en filas de una línea. Tarjeta de desarrollo de la vista de mes: CYC-254.

## v3 (2026-11-06): íconos de pictograma con color

La usuaria dijo que los íconos de trazo se veían planos y sin la personalidad de la marca, y entregó una referencia: pictogramas rellenos dentro de círculos de color. Cambios: **perlas de color** (círculo con anillo, el motivo de la marca) con **pictograma relleno blanco**, un ícono por deporte (voleibol, fútbol, básquetbol, correr, ciclismo, natación, pesas, yoga, otro) y por tipo (partido o competencia, descanso activo, viaje, lesión, otro); el **color según la familia** (naranja deporte, verde fuerza, azul descanso, oscuro competencia, rojo lesión, gris otros); **tarjetas con tinte** del color de su familia en lugar de borde punteado gris; chips de deporte con su ícono en el alta. Los glifos son de Phosphor Icons, peso «fill» (licencia MIT); para la app se pueden usar los mismos SVG o el paquete oficial para React Native. Los íconos de interfaz (más, repetir, candado) siguen siendo de trazo.

## Alineado con las reglas de color de las vistas de la app (2026-11-07)

Para convivir con `docs/diseno/vistas-app/`: el **azul es solo de la app** y el **verde con pesas es la fuerza del coach**. En las actividades del atleta, descanso activo y yoga pasan a **violeta**, las pesas propias a **naranja**; deportes en naranja, partido en tinta, viaje en gris. La tabla de colores de v3 queda reemplazada por esta.

## Calendarios del coach con íconos (CYC-270, 2026-11-08)

Maqueta: [`coach-calendarios.html`](coach-calendarios.html). Extiende la sección «Lo que ve el coach» y es el diseño de CYC-253. Solo lectura.

- **Inicio:** la fila de cada atleta mantiene las celdas de 72 px. Las sesiones del plan son **tarjeta blanca con perla verde**; lo que agregó el atleta es solo una **perla de 19 px** en una franja bajo una línea punteada. Hasta 2 perlas; con 3 o más, una perla y «+N». Interruptor «Actividades de los atletas» para apagar la capa y barra ámbar compacta con el aviso de choque de carga; el atleta afectado lleva un chip «Choque de carga: vie y sáb» y las celdas implicadas, borde ámbar.
- **Perfil del atleta:** interruptor **Semana | Mes**. La semana reutiliza las celdas del Inicio; el **mes** usa números de 11 px y perlas de 19 px (igual que la app), flechas de mes y el día elegido abre su **detalle** a la derecha (nombre, hora, intensidad, aviso de choque, «Lo agregó Camila. Solo lectura.»). Debajo, **Fuera del plan** con cada serie, su regla y la próxima fecha.
- **Colores por rol (#208):** azul solo de la app; verde, fuerza del coach; naranja, deporte del atleta; violeta, descanso; tinta, partido; gris, viaje.
- **Estados:** atleta sin actividades, capa apagada y error al cargar (las sesiones siguen visibles, la franja dice «No se pudieron cargar»). Con 20 atletas el Inicio sigue como hoy (los que necesitan atención primero).
- **Accesibilidad:** cada celda tiene nombre completo; el aviso lleva icono y texto; las perlas se nombran en el detalle y en «Fuera del plan».
- **Privacidad:** solo de atletas con vínculo activo (R5); notas del atleta no se muestran.

## Qué es

El atleta agrega por su cuenta lo que hace fuera del plan: «lunes y martes entreno voleibol», «sábado y domingo tengo partidos de liga». No dependen del coach, pero el coach los ve para planear. Nombre en la interfaz: **actividades** (en la ficha del coach, sección **Fuera del plan**).

## Verificado contra `origin/main`

| Dónde | Hoy | Qué hace el diseño |
|---|---|---|
| `apps/mobile/src/screens/CalendarScreen.tsx` | Hero del ciclo, chips de semana, tira de 7 días con **puntos** por sesión y lista de sesiones (nodo circular numerado). Sin ciclo: «Aún no tienes un ciclo activo». | Suma el «+» en el encabezado, **cuadritos** en la tira, encabezados por día en la lista y las tarjetas nuevas. |
| `apps/web/src/components/board/` (`DayCell`, `SessionCard`) | Celdas por día con sesiones arrastrables. | Capa de solo lectura bajo las sesiones; sin menú ni arrastre. |
| `docs/SEGURIDAD.md` R5 | Un coach solo accede a datos de un atleta con relación **activa**. | Mismo criterio para las actividades (ver Privacidad). |

## 1. Tarjetas e íconos

Seis tipos, ícono de trazo (rejilla 24, 2 px) dentro de un tile cuadrado de 10 px de radio: **Entrenamiento paralelo** (pelota, azul claro), **Partido o competencia** (copa, tile oscuro `#1f2228`), **Descanso activo** (hoja, verde), **Viaje** (maleta, gris), **Lesión** (venda, rojo suave) y **Otro** (estrella, contorno punteado). Los colores de estado (verde, rojo) se usan con su significado.

Para no confundirlas con las sesiones del coach (blancas, con nodo **circular** numerado), las actividades llevan tile **cuadrado** y borde **punteado**.

La **intensidad** son tres perlas (el motivo de la marca) más la palabra «Suave», «Media» o «Alta». Nunca solo color.

| Variante | Qué es | Uso |
|---|---|---|
| **A. Ficha con tile (recomendada)** | Dos líneas: nombre y hora; perlas a la derecha. | Por defecto. |
| B. Cinta de color | Una línea con barra lateral por tipo. | Más compacta; separa menos de las sesiones. |
| C. Chip | Pastilla de una línea. | Días con más de dos actividades: las extra pasan a chips. |

Estados: **hoy** (encabezado «Hoy» en azul), **pasado** (se atenúa, sin check: no se «completan»), **varias en un día**, **día con sesión y actividad** (sesión primero, actividades después), **serie** (ícono de repetir junto al nombre). Texto ≥ 11 px y fuente del sistema en la app.

## 2. Calendario semanal

- «+» azul en el encabezado, junto al avatar (36 px). También se puede tocar un día de la tira.
- Tira: sesiones = puntos; actividades = cuadritos con borde.
- Lista con **encabezado por día** («Lun 9», «Mié 11» con «Hoy»).

## 3. Flujo de alta

1. **Hoja «Agregar al calendario»**: fecha elegida (cambiable) y 6 tipos. Línea «Solo lo ve tu coach.».
2. **Entrenamiento**: deporte (chips: Voleibol, Fútbol, Natación, Ciclismo, Correr, Otro), hora de inicio, duración (60, 90, 120 min), intensidad, repetición, notas opcionales. **Guardar**.
3. **Repetición**: «No se repite» o «Cada semana» con días L M X J V S D; **Hasta**: fin del ciclo (sugerido), otra fecha o sin fecha final. Resumen: «Se agregan 6 lunes y 6 martes.».
4. **Partido o competencia**: nombre del evento, tipo (partido o competencia), hora, duración o todo el día, intensidad (alta por defecto), repetición.
5. **Abrir una actividad**: hoja con resumen, **Editar** y **Eliminar**.
6. **Series**: al editar o eliminar una serie, pregunta «Solo este día» (predeterminado) o «Toda la serie». Eliminar usa el botón rojo; Cancelar siempre disponible.

## 4. Lo que ve el coach (web)

- **Pizarra del ciclo:** debajo de las sesiones de cada día, tras una línea punteada, chips de 28 px de solo lectura (tile 20 px, nombre y hora, perlas). Interruptor **Actividades del atleta** (encendido por defecto) con leyenda.
- **Choque de carga:** ámbar con ícono y texto. Se marca el ícono de aviso en los dos días, el chip y la sesión («Pesada») y una barra bajo la semana: «Choque de carga: piernas pesadas el viernes y partido de liga el sábado, intensidad alta.» con **Ver detalle**, que explica con datos y sugiere mover o bajar el volumen. Es solo aviso: no cambia nada.
- **Ficha del atleta:** sección **Fuera del plan** con cada serie (tile, nombre, regla de repetición, próxima fecha, intensidad) y la nota «Lo agrega Camila; tú solo lo ves».
- Móvil web (≤ 640 px): la capa pasa a una lista bajo cada día, igual que las sesiones.

## 5. Estados vacíos

- **Con ciclo y sin actividades:** tarjeta punteada al final de la lista, «¿Entrenas algo por tu cuenta?», con botón **Agregar actividad**. Una sola vez; desaparece al agregar la primera.
- **Sin coach todavía:** puede agregar actividades. Aviso arriba: «Aún no tienes coach. Lo que agregues solo lo ves tú, hasta que aceptes la invitación de un coach.». Debajo, el vacío de siempre «Aún no tienes un ciclo activo».
- **Error:** aviso rojo «No se pudieron cargar tus actividades. Tus sesiones sí están al día.» con **Reintentar**; el error de actividades nunca esconde las sesiones.
- **Coach sin actividades:** «Camila aún no agregó actividades por su cuenta.».

## 6. Calendario por fechas y pestaña Hoy (supuestos de App móvil, recomendados)

- **Modo por semana calendario.** Las actividades son independientes del ciclo y del coach: se ven y se agregan también sin ciclo activo y sin coach. El Calendario suma un modo por **fechas reales**; el modo ciclo (S1, S2…) sigue como hoy. Con ciclo activo aparece el interruptor **Ciclo | Fechas** (flechas de semana anterior y siguiente, y «Ir a hoy»). Sin ciclo solo existe el modo fechas, sin hero ni interruptor.
- **Semanas antes y después del ciclo:** mismo calendario con las actividades y la etiqueta «Fuera del ciclo»; sin sesiones del coach. Antes del inicio, una tarjeta avisa cuándo empieza el ciclo.
- **Sin ciclo y sin coach:** en la maqueta (pantalla 3 de la sección 6 y la de «sin coach» de la sección 5) se agrega y se ve todo; el aviso de que solo lo ve el atleta se mantiene.
- **Pestaña Hoy:** fila discreta con borde punteado bajo la sesión: «Hoy también: voleibol, 19:00»; con varias, «voleibol y 1 más». Al tocarla abre el calendario en ese día. Sin actividades hoy, no aparece.
- **Sin hora = día local del atleta** (`toLocalDay`), sin zona horaria; se muestra «Todo el día» y se ordena antes que las que tienen hora.

## Privacidad (para CYC-251)

- Solo el atleta crea, edita y borra las suyas. El coach, **solo lectura** y solo con relación **activa** (R5); si la relación termina, el coach deja de verlas y el atleta las conserva.
- Se borran con la cuenta y van en la exportación de datos.
- Las **notas** son privadas del atleta: no se muestran al coach en la v1 (ver preguntas).

## Campos que la maqueta supone

`type` (training, match, rest, travel, injury, other), `title` (deporte o nombre), `date`, `startTime?`, `durationMin?` (o todo el día), `intensity?` (low, medium, high), `notes?` y repetición (días, hasta fecha o sin fin, con excepciones «solo este día»). Nuevo frente a la tarjeta de API: **tipos rest, travel e injury** y **todo el día**.

## Preguntas para la usuaria

1. ¿Apruebas la **variante A** como tarjeta por defecto, con chips (C) para días llenos?
2. ¿Los tipos Viaje y Lesión entran en la v1? **Lesión** podría pedir luego un aviso más fuerte al coach.
3. **Choque de carga:** propongo avisar cuando una actividad de intensidad alta o un partido cae el mismo día, o el día antes o el siguiente, de una sesión del coach con volumen en el tercio más alto del ciclo. ¿Te parece?
4. ¿Las **notas** del atleta las ve el coach, o quedan privadas?
5. Si el atleta **se vincula con un coach más tarde**, ¿el coach ve de inmediato lo que ya agregó? (Lo diseñé así y lo avisa el texto de «sin coach».)
6. ¿Quieres que el atleta también vea el aviso de choque de carga en la app? La v1 lo deja solo en la web del coach.

## Implementación de la API (CYC-251)

- **Modelo** (migración aditiva `20261107120000_eventos_atleta`): `AthleteEvent` (la serie: tipo, deporte, título, día de inicio, hora, duración, todo el día, intensidad, notas y la regla de repetición `repeatDays` + `repeatUntil`) y `AthleteEventException` (un día cancelado o editado «solo ese día», con `overrides`). Nada se duplica por semana: la lista se expande al consultar.
- **Endpoints:** `GET/POST /me/events`, `PATCH/DELETE /me/events/:id` (con `scope` `occurrence` o `series`) y `GET /athletes/:id/events` (coach, solo lectura). La lista por rango (máximo 92 días) viene **ya expandida**: cada ocurrencia con `seriesId`, `date` e `isException`.
- **v1:** «solo esta ocurrencia» cambia hora, duración, intensidad, título, tipo o notas de ese día, pero **no mueve el día** (400): para mover un día se borra y se crea otro. Las notas son privadas del atleta (el coach recibe `notes: null`).
- **Tipos y contrato:** `packages/shared/src/types/athlete-event.ts` y `fixtures/athleteEvents.ts`; la prueba e2e comprueba que la respuesta real tiene la forma del ejemplo.
