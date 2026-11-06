---
type: design
status: proposed
tags: [diseno, calendario, atleta, movil, web]
created: 2026-11-06
updated: 2026-11-06
---

# Actividades paralelas del atleta (CYC-237)

> **Contrastado con `origin/main` 9ad48ec.** Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta en [`propuestas.html`](propuestas.html) (se abre desde el disco). Desbloquea CYC-251 (API, ya en curso), CYC-252 (app móvil) y CYC-253 (web del coach).

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
