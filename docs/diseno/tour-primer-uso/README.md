---
type: design
parent: "[[PRD-Onboarding]]"
status: proposed
tags: [diseno, onboarding, web, mobile]
created: 2026-11-03
updated: 2026-11-03
---

# Tour de primer uso (CYC-190)

> Diseño del recorrido de la primera vez para que web y móvil se construyan sobre lo mismo. Bloquea CYC-191 (web) y CYC-192 (móvil). **Versión 2, contrastada con `origin/main` 76555e5** (la versión 1 se hizo sobre un checkout del 29-10, 100 commits atrasado). **Estado: propuesto, pendiente de aprobación de la usuaria.** Se ve en [`propuestas.html`](propuestas.html).

## Verificado contra origin/main 76555e5

Pantallas y código contrastados (todo leído en `origin/main`, no en el disco de la carpeta principal):

| Tema | Archivo(s) | Qué hay hoy y cómo lo toma el diseño |
|---|---|---|
| Registro | `RegisterPage.tsx`, `RoleChoice.tsx`, `lib/features.ts` | Dos opciones, **Soy coach** y **Soy atleta** (CYC-187). El atleta elige **iPhone o Android** y, en iPhone, el correo de su Apple ID para TestFlight (CYC-194). El registro público sigue cerrado: se entra con el **enlace privado del piloto**. Corrige la versión 1, que decía que la coach llegaba con la cuenta creada. |
| Verificación | `CheckEmailPage.tsx` | «Revisa tu email» → link → inicio de sesión. El tour de la coach empieza **después del primer ingreso**. |
| Aceptar invitación | `AcceptInvitationPage.tsx` | Dos casos: sin cuenta («Activa tu cuenta», define contraseña) y con cuenta («Acepta la invitación»). Termina en «Listo». El traspaso web → app se diseña sobre esa pantalla. |
| Atleta sin coach | `TodayPage.tsx`, `TodayScreen.tsx` | Ya existe «Falta tu coach» (se registró solo y nadie lo vinculó). Se **mantiene**: es el primer estado del recorrido de quien se registra solo. |
| Menú de usuario | `UserMenu.tsx` (web), `ProfileAvatar.tsx` (móvil) | Web: Mi cuenta, Cerrar sesión. Móvil: Mi cuenta, Política de privacidad, Términos de uso, Cerrar sesión. «Cómo usar Cycles» entra en ambos. |
| Navegación web | `AppLayout.tsx` | Coach: Inicio, Atletas, Biblioteca, Ejercicios. Atleta: Hoy, Calendario, Mis ciclos. |
| Biblioteca | `BibliotecaPage.tsx` | Rutinas y ciclos en una sola lista (con plantillas). Vacío actual: «Tu biblioteca está vacía» con **Crear rutina** y **Crear ciclo**. |
| Atletas | `AthletesPanel.tsx` | Sin atletas, el formulario de invitar **ya se muestra abierto** («Invita a tu primer atleta»). No hace falta estado vacío nuevo. |
| Ejercicios | `ExercisesPage.tsx` | Vacío actual: «Todavía no creaste ejercicios» con **Nuevo ejercicio**. Varios grupos musculares (CYC-196). |
| Inicio del coach | `AttentionPage.tsx`, `CoachHero.tsx`, `CoachWeekBoard.tsx` | Franja oscura «Empieza invitando a un atleta» con botón **Invitar atleta**; semana con la división de cada día (#151). La tarjeta del tour **reemplaza** ese estado mientras la guía esté activa. |
| Calendario del ciclo | `docs/diseno/ciclos-pizarra`, `docs/diseno/ciclo-en-calendario` | El ciclo se arma en la **pizarra** de la ficha del atleta (arrastrar, «+», autoguardado). El paso 4 apunta ahí. |
| Isla móvil | `FloatingTabBar.tsx` | **Cuatro pestañas**, solo íconos, tamaño fijo y resaltado deslizante (CYC-185): Calendario, Inicio, Resumen y Asistente. La etiqueta existe solo como nombre accesible. |
| Asistente móvil | `AssistantScreen.tsx` | Es demo: responde con texto provisorio. **No entra al tour** para no prometer lo que aún no hace. |
| Rol en móvil | `store/AuthContext.tsx` | `startSession` rechaza todo rol distinto de `athlete`: **la app es solo de atletas**. Se mantiene D5. |
| Inicio de sesión móvil | `LoginScreen.tsx`, `WelcomeCurtain` | Pantalla rediseñada (anillo, etiqueta flotante) y cortina de bienvenida al entrar. **El tour empieza cuando la cortina termina.** |
| Contraseña | `PasswordField` | Botón de ojo (CYC-195). Sin cambios para el tour. |
| Descanso y notas | `RestTimer`, notas por ejercicio (CYC-60..63) | La pista de la primera serie menciona el descanso y la nota del coach. |
| Estados vacíos del atleta | `TodayScreen.tsx`, `CalendarScreen.tsx`, `SummaryScreen.tsx`, `CyclesPage.tsx` | Calendario y Resumen ya tienen su texto. Falta distinguir, en Hoy, «sin ciclo» de «al día», y dar contenido a «Mis ciclos». |

## Decisiones de diseño (a aprobar)

| # | Decisión | Por qué |
|---|---|---|
| D1 | La coach usa un **asistente de 4 pasos sobre las pantallas reales**: una tarjeta en Inicio y una barra de paso arriba de cada pantalla. No hay formularios reducidos propios. | Cierra la pregunta 1b del PRD sin duplicar lógica. |
| D2 | El asistente **se pausa** en el paso 3 (esperar que el atleta acepte). | La invitación vive hasta 7 días. |
| D3 | El progreso **se deriva de los datos** (rutina, invitación, atleta activo, sesión asignada). No se guarda un contador. | No se desincroniza. |
| D4 | El atleta tiene un tour de **3 marcas** sobre la isla (Inicio, Calendario, Resumen), una pista en la primera serie y un cierre de la primera sesión. El Asistente queda fuera hasta que deje de ser demo. | La isla ya no tiene etiquetas: la marca debe nombrar la pestaña en su texto. |
| D5 | La **app móvil es solo de atletas**; el tour de la coach es solo web. | Verificado en `AuthContext.tsx`. |
| D6 | Acceso permanente **«Cómo usar Cycles»** en el menú de usuario (web) y en el menú del avatar (móvil). | Reabrir sin buscar. |
| D7 | Se guarda **una sola cosa por cuenta**: `tourStatus`. Web y móvil la comparten. | Terminar en uno no repite en el otro. |
| D8 | La tarjeta del tour **reemplaza** la franja «Empieza invitando a un atleta» mientras esté activa. | Evita dos llamados a invitar en la misma pantalla. |

## Cómo llega cada persona

- **Coach:** enlace privado del piloto → **Soy coach** → «Revisa tu email» → inicio de sesión → Inicio vacío. Aquí empieza el tour.
- **Atleta que se registra solo:** enlace privado → **Soy atleta** → elige iPhone o Android → «Revisa tu email» → inicio de sesión → **«Falta tu coach»** (ya existe). El tour de la app espera a tener coach; si entra antes, la marca de Inicio lo dice.
- **Atleta invitado sin cuenta:** correo de la invitación → «Activa tu cuenta» → **traspaso a la app** (nuevo).
- **Atleta invitado con cuenta:** correo → «Acepta la invitación» → traspaso a la app.

## Recorrido de la coach (web)

Aparece solo a coaches sin rutinas, atletas ni ciclos.

**Bienvenida** (diálogo, una sola vez)
- Título: «Te damos la bienvenida a Cycles»
- Texto: «Vamos a dejar a tu atleta listo para entrenar. Son cuatro pasos y puedes salir cuando quieras.»
- Botones: **Empezar** · **Ahora no**

**Los cuatro pasos**

| # | Paso | Dónde lo hace | Se completa cuando | Texto de la barra |
|---|---|---|---|---|
| 1 | Crea tu primera rutina | Biblioteca → Crear rutina | Existe ≥1 rutina | «Una rutina es una sesión que armas una vez y reutilizas. Empieza con 2 o 3 ejercicios.» |
| 2 | Invita a tu atleta | Atletas (formulario abierto) | Existe ≥1 invitación | «Escribe su nombre y su email, el mismo con el que se registre. Le llega un correo para entrar.» |
| 3 | Espera su aceptación | Cualquier pantalla | Un atleta acepta | «Tu atleta aún no acepta. Mientras tanto, arma más rutinas.» |
| 4 | Crea su ciclo y asigna la primera sesión | Ficha del atleta → Nuevo ciclo → pizarra | El ciclo tiene ≥1 sesión asignada | «Crea el ciclo y toca «+» en un día para asignar una rutina. Con la primera sesión, el ciclo queda activo.» |

Si falta un ejercicio al armar la rutina, la barra del paso 1 enlaza al atajo **Crear** del buscador de ejercicios.

**Pausa en el paso 3.** La tarjeta de Inicio pasa a «Esperando a {Nombre}» con **Reenviar invitación** y **Seguir con la app**.

**Retorno.** Cuando el atleta acepta: «{Nombre} ya aceptó. Crea su ciclo.» con **Crear ciclo**.

**Cierre** (al asignar la primera sesión)
- Título: «Tu atleta ya puede entrenar»
- Texto: «El ciclo está activo y {Nombre} verá su primera sesión en Hoy. Desde Inicio ves quién necesita tu atención.»
- Botón: **Ir a Inicio**

### Piezas

- **Tarjeta «Empieza con Cycles» en Inicio** (debajo del título, en lugar de la franja de «Empieza invitando a un atleta»): los 4 pasos con marca de hecho, el siguiente resaltado con botón primario y el enlace **No quiero la guía**. Se oculta al completar los 4 o al descartarla; al ocultarse vuelve la franja habitual.
- **Barra de paso:** fila fija bajo el header, con «Paso 2 de 4», la instrucción y **Salir**.
- **Panel «Cómo usar Cycles»:** abre desde el menú de usuario. Muestra los 4 pasos con su estado, **Volver a ver la guía** y **Abrir el manual** (`MANUAL-COACH`).

## Recorrido del atleta

### Traspaso web → app (después de aceptar la invitación)

Reemplaza la pantalla «Listo» de `AcceptInvitationPage.tsx`:

- Título: «Tu cuenta está lista»
- Texto: «Entrenas desde la app. Entra con {email}.»
- Selector **iPhone** / **Android**:
  - iPhone: «Instala Cycles con TestFlight. Te invitamos al correo de tu Apple ID.» + **Instalar la app**.
  - Android: «Abre app.getcycles.app en Chrome y agrégala a tu pantalla de inicio.» + **Ver cómo**.
- Enlace secundario: **Seguir en el navegador**.

Si la API ya sabe qué teléfono eligió (registro con CYC-194), se muestra directo el bloque que corresponde, sin selector. Hoy `phonePlatform` solo viaja en el registro: a confirmar con desarrollo si lo expone al usuario.

### Tour en la app móvil (primer ingreso, tras la cortina de bienvenida)

Tres marcas, una por pestaña, con **Siguiente** y **Saltar**. La isla se mantiene sobre el velo y el ícono de la pestaña explicada lleva un anillo. Como la isla es solo de íconos, **cada texto nombra la pestaña**.

| # | Pestaña | Texto |
|---|---|---|
| 1 | Inicio | «En Inicio está tu sesión de hoy. Toca **Empezar sesión** cuando vayas a entrenar.» |
| 2 | Calendario | «En Calendario ves tu semana y todo tu ciclo.» |
| 3 | Resumen | «En Resumen ves tu carga y tu avance, a medida que registras.» |

Sin coach vinculado, la marca 1 dice «En Inicio aparecerá tu sesión de hoy cuando tu coach te invite.» Sin ciclo: «…cuando tu coach te asigne una.»

**Pista de la primera serie** (una vez, en el registro): «Ajusta reps y peso con − y +, y toca **Registrar serie**. Después te preguntamos cuántas reps más podías hacer. Entre series corre el descanso.» Botón **Entendido**.

**Cierre de la primera sesión:** «Primera sesión guardada. Tu coach ya puede verla.»

**Reabrir:** menú del avatar → **Cómo usar Cycles** (entre Mi cuenta y Política de privacidad).

### Atleta en la web

La atleta que entra por el navegador ve las mismas tres explicaciones como una tarjeta descartable en Hoy, sin marcas sobre la navegación (Hoy, Calendario, Mis ciclos).

## Estados vacíos (CYC-75 y CYC-76)

Se usa el componente `EmptyState` existente. Solo se diseña lo que **falta o cambia**; lo que ya existe se conserva.

### Coach (web)

| Pantalla | Hoy | Propuesta |
|---|---|---|
| Inicio, sin atletas | Franja «Empieza invitando a un atleta» | **Cambia** mientras la guía esté activa: la tarjeta «Empieza con Cycles» la reemplaza. Con la guía descartada, queda la franja actual. |
| Inicio, sin avisos | «Ningún atleta necesita tu atención.» | Se conserva. |
| Biblioteca vacía | «Tu biblioteca está vacía», con **Crear rutina** y **Crear ciclo** | Se conserva. |
| Atletas, sin atletas | Formulario abierto «Invita a tu primer atleta» | Se conserva. |
| Ejercicios, Míos vacío | «Todavía no creaste ejercicios», con **Nuevo ejercicio** | Se conserva. |
| Crear ciclo, sin atletas activos | No existe | **Nuevo:** «Falta que tu atleta acepte» / «Para crear un ciclo necesitas un atleta que ya haya aceptado su invitación.» / **Ver invitaciones**. |

### Atleta (móvil y web)

| Pantalla | Hoy | Propuesta |
|---|---|---|
| Hoy, se registró solo y sin coach | «Falta tu coach» | Se conserva. |
| Hoy, con coach y sin ciclo | Se confunde con «Todo al día» / «No tienes una sesión pendiente» | **Nuevo:** «Tu coach está preparando tu ciclo» / «Cuando te asigne tu primera sesión, la verás aquí.» |
| Hoy, con ciclo y sin sesión pendiente | «Todo al día» (web), «No tienes una sesión pendiente» (móvil) | **Cambia** a «Hoy no tienes sesión» / «Descansa.» (voz y tono). |
| Mis ciclos (web), vacío | Sin texto propio | **Nuevo:** «Aún no tienes ciclos» / «Aparecerán cuando tu coach te asigne uno.» |
| Calendario y Resumen (móvil) | «Aún no tienes un ciclo activo» | Se conserva. |

## Qué se guarda por cuenta

| Campo | Valores | Se escribe cuando |
|---|---|---|
| `tourStatus` | `pending` (por defecto) · `skipped` · `completed` | Salta o descarta («No quiero la guía», «Saltar», «Ahora no»), o termina |

- Todo lo demás se deriva de los datos. No se guardan pasos.
- Reabrir con **Cómo usar Cycles** no borra el estado.
- Ningún dato de salud ni de rendimiento (R1–R12 de `docs/SEGURIDAD.md`).
- Móvil y web leen el mismo campo.

## Accesibilidad (notas para el desarrollo)

- **Foco:** bienvenida y marcas atrapan el foco, lo devuelven al disparador y se cierran con Esc (web) o el gesto atrás (móvil).
- **Roles:** bienvenida y cierre son `role="dialog"` con `aria-labelledby`. La barra de paso es una región con `aria-label="Guía de inicio"`; el progreso se dice con texto («Paso 2 de 4»).
- **Isla solo de íconos:** cada marca lleva `accessibilityLabel` con el nombre de la pestaña, la posición («Marca 1 de 3») y el texto. El anillo de la pestaña explicada no es la única señal.
- **Contraste:** botones con `#1a66dd` sobre blanco; texto secundario `#5c6068`. `#3080fc` solo para estado, nunca en texto chico.
- **Marca de hecho:** ícono más texto «Hecho», nunca solo color.
- **Destinos táctiles:** mínimo 44 × 44 px (la isla ya lo cumple).
- **Movimiento:** sin animaciones propias; si se añade transición, respetar «reducir movimiento» (`useReduceMotion`).
- **A verificar con código:** orden de tabulación, anuncio del cambio de paso y que la barra no tape contenido con el teclado abierto.

## Fuera de alcance

- Pestaña Asistente en el tour (es demo).
- Tutoriales en video, correos nuevos de bienvenida o recordatorio.
- Vista de seguimiento del equipo por coach (PRD §5.3).
- Rutina de ejemplo precargada (PRD §10.7).

## Preguntas para la usuaria

1. ¿Apruebas los cuatro pasos y que el plan se active solo al asignar la primera sesión?
2. ¿El Asistente queda fuera del tour mientras sea demo?
3. ¿Android se muestra como «agregar a la pantalla de inicio» mientras no haya Google Play?

## Cómo se conecta con otras tarjetas

- **CYC-191 (web):** bienvenida, tarjeta en Inicio, barra de paso, panel «Cómo usar Cycles», estados vacíos nuevos del coach (CYC-75), traspaso, tarjeta del atleta en Hoy.
- **CYC-192 (móvil):** tour de 3 marcas, pista de la primera serie, cierre de la primera sesión, «Cómo usar Cycles» en el avatar, estados nuevos del atleta (CYC-76).
- **CYC-170:** aporta el contenido del manual enlazado en el panel.
