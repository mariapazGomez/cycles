---
type: design
parent: "[[PRD-Onboarding]]"
status: proposed
tags: [diseno, onboarding, web, mobile]
created: 2026-11-03
updated: 2026-11-03
---

# Tour de primer uso (CYC-190)

> Diseño del recorrido de la primera vez para que web y móvil se construyan sobre lo mismo. Bloquea CYC-191 (web) y CYC-192 (móvil). **Estado: propuesto, pendiente de aprobación de la usuaria el 2026-11-03.** Se ve en [`propuestas.html`](propuestas.html).

## Decisiones de diseño (a aprobar)

| # | Decisión | Por qué |
|---|---|---|
| D1 | La coach usa un **asistente de 4 pasos sobre las pantallas reales**: una tarjeta en Inicio y una barra fija de paso arriba de cada pantalla. No hay formularios reducidos propios. | Cierra la pregunta 1b del PRD sin duplicar lógica: los formularios son los de la Biblioteca, Atletas y el calendario del ciclo. |
| D2 | El asistente **se pausa** en el paso 3 (esperar a que la atleta acepte) y se retoma solo. | La invitación vive hasta 7 días; un asistente lineal quedaría bloqueado. |
| D3 | El progreso **se deriva de los datos** (existe una rutina, una invitación, una atleta activa, una sesión asignada). No se guarda un contador. | No se desincroniza si la coach hace cosas por fuera del asistente. |
| D4 | La **atleta** tiene un tour corto de 3 marcas sobre la isla de pestañas (Inicio, Calendario, Resumen), una pista al registrar su primera serie y un cierre de primera sesión. | Es lo mínimo que explica la app sin tutorial largo. |
| D5 | La **app móvil es solo de atleta** (no tiene rol de coach). El tour del coach es solo web. | Hoy el móvil no distingue roles; el coach trabaja en el computador. |
| D6 | Acceso permanente **«Cómo usar Cycles»** en el menú de usuario (web) y en el menú del avatar (móvil). | Reabrir sin buscar; funciona aunque se haya saltado. |
| D7 | Se guarda **una sola cosa por cuenta** en el servidor: si la persona saltó o terminó el tour. | Lo demás se deriva. Así web y móvil comparten estado: terminar en uno no repite en el otro. |

## Recorrido de la coach (web)

Aparece solo a coaches sin rutinas, atletas ni ciclos. El registro está cerrado: la coach llega con la cuenta ya creada.

**Bienvenida** (diálogo, una sola vez)
- Título: «Te damos la bienvenida a Cycles»
- Texto: «Vamos a dejar a tu atleta listo para entrenar. Son cuatro pasos y puedes salir cuando quieras.»
- Botones: **Empezar** · **Ahora no**

**Los cuatro pasos**

| # | Paso | Dónde lo hace | Se completa cuando | Texto de la barra |
|---|---|---|---|---|
| 1 | Crea tu primera rutina | Biblioteca → Crear → Rutina | Existe ≥1 rutina | «Una rutina es una sesión que armas una vez y reutilizas. Empieza con 2 o 3 ejercicios.» |
| 2 | Invita a tu atleta | Atletas → Invitar atleta | Existe ≥1 invitación | «Escribe su nombre y su email. Le llega un correo para activar su cuenta.» |
| 3 | Espera su aceptación | Cualquier pantalla | Una atleta acepta | «Tu atleta aún no acepta. Mientras tanto, arma más rutinas.» |
| 4 | Crea su ciclo y asigna la primera sesión | Ficha del atleta → calendario del ciclo | El ciclo tiene ≥1 sesión asignada | «Elige las fechas y arrastra una rutina a un día. Al asignar la primera sesión, el ciclo queda activo.» |

Si falta un ejercicio al armar la rutina, la barra del paso 1 enlaza a **Ejercicios → Nuevo ejercicio**.

**Pausa en el paso 3.** La barra pasa a un estado tranquilo con **Reenviar invitación** y **Seguir con la app**. Inicio muestra la tarjeta «Esperando a {Nombre}».

**Retorno.** Cuando la atleta acepta, la tarjeta cambia a «{Nombre} ya aceptó. Crea su ciclo.» con el botón **Crear ciclo**.

**Cierre** (al asignar la primera sesión)
- Título: «Tu atleta ya puede entrenar»
- Texto: «El ciclo está activo y verá su primera sesión en Hoy. Desde Inicio ves quién necesita tu atención.»
- Botón: **Ir a Inicio**

### Piezas

- **Tarjeta «Empieza con Cycles» en Inicio:** lista de los 4 pasos con marca de hecho, el siguiente resaltado con un botón primario y el enlace **No quiero la guía**. Se oculta cuando los 4 pasos están hechos o la coach la descarta.
- **Barra de paso:** fila fija bajo el header con «Paso 2 de 4 · Invita a tu atleta», la instrucción en una frase y **Salir**. Una acción principal visible a la vez.
- **Panel «Cómo usar Cycles»:** abre desde el menú de usuario. Muestra los 4 pasos con su estado y dos acciones: **Volver a ver la guía** y **Abrir el manual** (`docs/MANUAL-COACH.md` publicado).

## Recorrido de la atleta

### Traspaso web → app (después de activar la cuenta)

La atleta acepta la invitación en el navegador del celular y entrena en la app. La pantalla final de *Activa tu cuenta* pasa a ser un traspaso:

- Título: «Tu cuenta está lista»
- Texto: «Entrenas desde la app. Entra con {email}.»
- Selector **iPhone** / **Android** (coherente con la elección del registro, CYC-194):
  - iPhone: «Instala Cycles con TestFlight» + botón **Instalar la app**.
  - Android: «Abre `app.getcycles.app` en Chrome y agrégala a tu pantalla de inicio» + botón **Ver cómo**.
- Enlace secundario: **Seguir en el navegador**.

### Tour en la app móvil (primer inicio de sesión)

Tres marcas sobre la isla flotante, una por pestaña, con **Siguiente** y **Saltar**. Al final, **Listo**.

| # | Marca sobre | Texto |
|---|---|---|
| 1 | Inicio | «Aquí está tu sesión de hoy. Toca **Empezar sesión** cuando vayas a entrenar.» |
| 2 | Calendario | «Mira tu semana y todo tu ciclo.» |
| 3 | Resumen | «Tu carga y tu avance, a medida que registras.» |

Si aún no tiene ciclo, la marca 1 dice «Aquí aparecerá tu sesión de hoy.»

**Pista de la primera serie** (una sola vez, en el registro): «Ajusta reps y peso con − y +, y toca **Registrar serie**. Después te preguntamos cuántas reps más podías hacer.» Botón **Entendido**.

**Cierre de la primera sesión:** «Primera sesión guardada. Tu coach ya puede verla.»

**Reabrir:** menú del avatar → **Cómo usar Cycles** (repite las 3 marcas).

### Atleta en la web

La atleta que entra por el navegador ve las mismas tres explicaciones como una tarjeta descartable en Hoy (sin marcas sobre la navegación).

## Estados vacíos (CYC-75 y CYC-76)

Todos usan el componente `EmptyState` (tarjeta sobre la cadena de proteína). Título corto, una frase y, si hay acción, un solo botón.

### Coach (web)

| Pantalla | Título | Texto | Acción |
|---|---|---|---|
| Inicio, sin atletas | «Aquí verás a quién necesita tu atención» | «Empieza invitando a tu atleta.» | **Invitar atleta** |
| Inicio, con atletas y sin avisos | «Todo al día» | «Ningún atleta necesita tu atención ahora.» | — |
| Biblioteca, sin rutinas | «Aún no tienes rutinas» | «Crea la primera: una sesión que reutilizas en todos tus ciclos.» | **Crear rutina** |
| Atletas, sin atletas | «Todavía no invitas a nadie» | «Tu atleta recibe un correo y entra desde su celular.» | **Invitar atleta** |
| Ciclos, sin atletas activos | «Falta que tu atleta acepte» | «Para crear un ciclo necesitas un atleta que ya haya aceptado su invitación.» | **Ver invitaciones** |
| Ejercicios, pestaña Míos | «Aún no creas ejercicios propios» | «El catálogo de Cycles ya trae los básicos.» | **Nuevo ejercicio** |

### Atleta (móvil y web)

| Pantalla | Título | Texto |
|---|---|---|
| Hoy, sin ciclo | «Tu coach está preparando tu ciclo» | «Cuando te asigne tu primera sesión, la verás aquí.» |
| Hoy, con ciclo y sin sesión pendiente | «Hoy no tienes sesión» | «Descansa.» |
| Mis ciclos, vacío | «Aún no tienes ciclos» | «Aparecerán cuando tu coach te asigne uno.» |
| Calendario, sin ciclo activo | «Aún no tienes un ciclo activo» | «Tu coach lo asigna y lo verás aquí.» |
| Resumen, sin registros | «Aquí verás tu avance» | «Se llena con tus primeras sesiones.» |

Hoy se distingue **sin ciclo** de **al día**: reemplaza al actual «Todo al día» para la atleta nueva (brecha B3/B4 del PRD).

## Qué se guarda por cuenta

Un solo dato por usuaria, en el servidor (lo decide el desarrollo; nombres de ejemplo):

| Campo | Valores | Se escribe cuando |
|---|---|---|
| `tourStatus` | `pending` (por defecto) · `skipped` · `completed` | Salta o descarta («No quiero la guía», «Saltar», «Ahora no»), o termina |

- **Todo lo demás se deriva** de los datos (rutinas, invitaciones, ciclos, sesiones). No se guardan pasos.
- «Ahora no» en la bienvenida equivale a `skipped`; **Cómo usar Cycles** siempre puede reabrirlo.
- Reabrir no borra el estado: al terminar o saltar de nuevo se vuelve a escribir.
- No se guarda ningún dato de salud ni de rendimiento (reglas R1–R12 de `docs/SEGURIDAD.md`).
- Móvil y web leen el mismo campo.

## Accesibilidad (notas para el desarrollo)

- **Foco:** el diálogo de bienvenida y las marcas del tour atrapan el foco, devuelven el foco al disparador al cerrar y se cierran con Esc (web) o con el gesto atrás (móvil).
- **Roles:** bienvenida y cierre son `role="dialog"` con `aria-labelledby`. La barra de paso es una región con `aria-label="Guía de inicio"`; el progreso se anuncia como «Paso 2 de 4» (no solo con color).
- **Contraste:** botones con `#1a66dd` sobre blanco; texto secundario `#5c6068`. `#3080fc` solo para estado (marca de hecho y subrayados), nunca en texto chico.
- **Marca de hecho:** icono + texto «Hecho», nunca solo el color.
- **Destinos táctiles:** mínimo 44 × 44 px en **Siguiente**, **Saltar**, **Salir** y la isla.
- **Móvil:** cada marca tiene `accessibilityLabel` con el texto completo y la posición («Marca 1 de 3»). Con lector de pantalla se enfoca el texto, no el resalte.
- **Movimiento:** sin animaciones; si se añade una transición, respetar «reducir movimiento».
- **Texto:** frases cortas, sin jerga de ciencia del deporte; todo en «tú».
- A verificar con código (no se ve en la maqueta): orden de tabulación, anuncio del cambio de paso y que la barra no tape contenido con el teclado abierto.

## Fuera de alcance

- Tutoriales en video y correos nuevos (bienvenida, recordatorio): se evalúan aparte (PRD-Onboarding §10.4).
- Vista de seguimiento del equipo por coach (PRD §5.3).
- Rutina de ejemplo precargada (PRD §10.7): no se incluye; queda como pregunta abierta.

## Preguntas para la usuaria

1. ¿Apruebas los cuatro pasos y que el plan se active solo al asignar la primera sesión (ya decidido el 2026-10-06)?
2. ¿Queda bien que la app móvil sea solo de atleta y el tour del coach solo web?
3. ¿Android se muestra como «Agregar a la pantalla de inicio» mientras no haya Google Play?

## Cómo se conecta con otras tarjetas

- **CYC-191 (web)** implementa: bienvenida, tarjeta en Inicio, barra de paso, panel «Cómo usar Cycles», estados vacíos del coach (CYC-75), tarjeta de la atleta en Hoy web.
- **CYC-192 (móvil)** implementa: tour de 3 marcas, pista de primera serie, cierre de primera sesión, «Cómo usar Cycles» en el avatar, estados vacíos de la atleta (CYC-76).
- **CYC-170** aporta el contenido del manual enlazado en el panel.
