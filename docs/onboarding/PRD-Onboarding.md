---
type: prd
level: feature
parent: "[[PRD-General]]"
status: ready
phase: "Fase 3.5 — Piloto"
version: 1.0
created: 2026-10-06
updated: 2026-11-04
tags: [prd, feature/onboarding]
related: ["[[PRD-Autenticacion]]", "[[PRD-InvitacionAtletas]]", "[[PRD-AppMovilAtleta]]", "[[voz-y-tono]]", "[[tour-primer-uso]]", "[[PRD-EjecucionYSeguimiento]]"]
---

# PRD — Onboarding

> Hijo de [[PRD-General]]. **Versión 1.0, `status: ready` (2026-11-04):** lo diseñado se aprobó y casi todo está construido. Este documento dice **cómo debe ser** la primera vez de cada rol y **en qué estado está cada pieza** en `origin/main` (c879ab4 y posteriores). Para el recorrido paso a paso con las pantallas de hoy, ver `docs/ONBOARDING.md` y `docs/MANUAL-COACH.md`; el diseño detallado está en [`docs/diseno/tour-primer-uso`](../diseno/tour-primer-uso/README.md).

## 0. Cómo usar este documento

- Cada versión se anota en el [historial](#12-historial-de-versiones). No se reescribe en silencio.
- **[decidido]** = aprobado por la usuaria, con fecha. **[hecho]** = ya está en `main`. **[pendiente]** = falta construirlo o revisarlo. **[diferido]** = decidido dejarlo fuera de esta versión.
- Las preguntas de §10 están todas cerradas o diferidas: no bloquean `ready`.
- El plan de ejecución (§11) es lo único que lee el desarrollo; el resto es el porqué.

## 1. Resumen

Una persona nueva llega, crea su cuenta y cae en una app vacía sin que nadie le diga qué hacer primero. El onboarding de Cycles es el recorrido que lleva a cada rol de «tengo una cuenta» a su **primer momento de valor**: para la coach, **un ciclo con una primera sesión asignada a una atleta que ya aceptó**; para la atleta, **su primera sesión registrada** en la app.

### 1.1 Decisiones aprobadas

| Fecha | Decisión | Dónde |
|---|---|---|
| 2026-10-06 | La atleta entrena con la **app iOS**; la invitación se acepta en el navegador y hay un **traspaso web → app**. | §5.2 |
| 2026-10-06 | Una sola marca por cuenta para la guía (`tourStatus`), el progreso se **deriva de los datos** y la guía **se pausa** mientras la atleta no acepta. | §5.1, §11.1 |
| 2026-11-03 | La guía es una **capa de marcas sobre la interfaz real** (halo + globo corto de hasta 12 palabras), no un asistente, un diálogo ni una presentación (v3). Pide **hacer**, no leer. | §5.1 |
| 2026-11-03 | **Orden de arriba hacia abajo:** atleta → ciclo → rutina → ejercicios → ponerla en un día → seguimiento (v3.1). Antes de la guía, una tarjeta «Así se arma un ciclo» (el ciclo contiene rutinas y las rutinas contienen ejercicios). **Invitar va primero** porque un ciclo solo se crea para una atleta que ya aceptó. | §5.1 |
| 2026-11-03 | La parada «Ejercicios» **deja de ser un paso**: el ejercicio se crea dentro de la rutina con **Crear «nombre»**. | §5.1 |
| 2026-11-03 | **La app móvil es solo de atletas**: el tour de la coach es solo web. El **Asistente** (demo) queda fuera del tour. | §5.1, §5.2 |
| 2026-11-03 | Tour móvil con **tres marcas** que piden **tocar** el botón o la pestaña (M1–M5); pista de la primera serie y cierre de la primera sesión. | §5.2, §11.2 |
| 2026-11-03 | La atleta en la web usa el **mismo mecanismo**: tres marcas sobre el menú (Hoy, Calendario, Mis ciclos). | §5.2 |
| 2026-11-03 | **Acceso permanente** «Cómo usar Cycles» en el menú de usuario (web) y en el avatar (móvil), y opción de **saltar** en todo momento. | §5.1, §5.2 |
| 2026-11-03 | **Estados vacíos** con guía: se conserva lo que ya existía y se diseña lo que faltaba (CYC-75, CYC-76). | §6 |
| 2026-11-04 | Un ciclo **nace activo**: no existe el paso «activar» (sustituye a la «activación automática» de 2026-10-06). | §5.4 |

## 2. Problema y motivación

Brechas observadas al inicio (v0.1) y cómo quedan:

| # | Brecha | Rol | Estado |
|---|---|---|---|
| B1 | Tras verificar el email, la coach cae en una pantalla sin guía de siguiente paso | Coach | **Resuelta** [hecho]: la guía arranca sola en el primer ingreso (CYC-191, CYC-214). |
| B2 | El orden correcto vivía solo en un documento | Coach | **Resuelta** [hecho]: el orden está en la guía y en la tarjeta «Así se arma un ciclo». |
| B3 | La atleta no veía nada hasta que el plan se activaba | Coach y atleta | **Resuelta** [hecho]: un ciclo nace activo y, al asignar la primera sesión, la coach ve «Tu atleta ya puede entrenar» (§5.4). |
| B4 | Un atleta sin plan ve *Hoy* vacío | Atleta | **Resuelta en la web** [hecho]: «Falta tu coach» y «Tu coach está preparando tu ciclo». En la app: ver §6. |
| B5 | La invitación se acepta en la web pero la atleta entrena en la app | Atleta | **Resuelta** [hecho]: pantalla de traspaso con iPhone (TestFlight) y Android (CYC-194, CYC-191). |
| B6 | La primera visita tras 15 min sin uso tarda ~50 s | Todos | **Vigente**: ya se avisa en pantalla; no es parte del onboarding. |
| B7 | No hay forma de saber en qué paso va cada persona | Equipo | **Parcial** [hecho]: el portal del equipo (CYC-193) muestra Usuarios y Uso; el embudo por persona queda [diferido]. |

## 3. Principios

1. **Un solo siguiente paso.** En cada momento, una acción principal visible. [decidido]
2. **Primer valor rápido.** El recorrido se mide hasta el primer ciclo con una sesión asignada (coach) y la primera sesión registrada (atleta), no hasta «cuenta creada». [decidido]
3. **Voz de compañera de entrenamiento** ([[voz-y-tono]]): tuteo, frases cortas, sin dramatizar, sin culpar. [decidido]
4. **Lo vacío orienta.** Ningún estado vacío es solo «no hay nada»: dice qué hacer o qué se espera. [decidido]
5. **Se puede saltar y volver.** Nada del onboarding bloquea usar la app. [decidido]
6. **La guía no es una pantalla, es una capa.** La interfaz se ve y funciona tal cual; el halo no bloquea toques ni atenúa el resto. [decidido 2026-11-03]

## 4. Alcance

### Dentro de alcance

- Recorrido de la **coach** en web: de la primera entrada a su primer ciclo con una sesión asignada, y dónde mirar después.
- Recorrido del **atleta**: de la invitación (o del registro propio) a su primera sesión registrada (web para aceptar, app para entrenar).
- **Tour** de cada rol sobre la interfaz real, con estado por cuenta, saltar y reabrir.
- Estados vacíos clave de ambos roles.
- Correos del recorrido (verificación e invitación).

### Fuera de alcance

- Onboarding comercial (landing, contacto, ventas): ver [[PRD-LandingContacto]].
- Tutoriales en video o contenido educativo largo.
- Cambios al modelo de roles (coach o atleta, nunca ambos; R4).
- Importación masiva de planes (`apps/api/scripts/importar-plan.ts` es una herramienta interna).
- Pestaña **Asistente** de la app dentro del tour (es una demo).
- Rutina o ciclo de ejemplo precargado.

## 5. Roles y recorridos

### 5.0 Cómo llega cada persona [hecho]

El registro público está cerrado en el piloto: se entra con el **enlace privado con código** (`/register?codigo=…`). Hay **dos roles** (CYC-187).

| Quién | Camino |
|---|---|
| **Coach** | Enlace privado → **Soy coach** → «Revisa tu email» → inicio de sesión → Inicio vacío: **empieza la guía**. |
| **Atleta que se registra sola** | Enlace privado → **Soy atleta** → elige **iPhone o Android** (y el correo de su Apple ID para TestFlight, CYC-194) → verifica → entra: ve «Falta tu coach» hasta que su coach la invite con el mismo correo. |
| **Atleta invitada sin cuenta** | Correo de invitación → «Activa tu cuenta» (define contraseña) → **traspaso a la app**. |
| **Atleta invitada con cuenta** | Correo → «Acepta la invitación» → traspaso a la app. |

### 5.1 Coach (web): guía sobre la interfaz real [hecho: CYC-191, CYC-214; diseño v3.1 aprobado el 2026-11-03]

**Parte de:** primera entrada con `tourStatus = pending` y sin atletas, ciclos, rutinas ni ejercicios propios (o una guía ya empezada).
**Primer valor:** un ciclo con una primera sesión asignada a una atleta que ya aceptó.

**Tarjeta inicial «Así se arma un ciclo».** Una sola vez, antes del primer paso: tres cajas encajadas (Ciclo ⊃ Rutinas ⊃ Ejercicios) y tres líneas; **Empezar la guía** o **Ahora no**. Es la única pieza que ocupa pantalla (pequeña, sin velo).

**Los seis pasos** (cada uno con una o más marcas: halo sobre el elemento real y un globo de hasta 12 palabras):

| # | Paso | Dónde | Se completa cuando |
|---|---|---|---|
| 1 | **Invita a tu atleta** | Atletas → formulario → **Enviar invitación** | Existe ≥ 1 atleta invitado |
| — | *Espera* | Chip discreto; la guía queda en pausa | Un atleta acepta |
| 2 | **Crea su ciclo** | Atletas → ficha del atleta → **Nuevo ciclo** | El atleta tiene ≥ 1 ciclo |
| 3 | **Crea una rutina** | Pizarra del ciclo: **«+»** de un día → **Crear rutina nueva** (cajón) | Existe ≥ 1 rutina |
| 4 | **Agrega ejercicios** | Buscador del cajón; **Crear «nombre»** si falta uno | Existe ≥ 1 rutina con ejercicios |
| 5 | **Ponla en un día** | **«+»** del día → elegir la rutina | Hay ≥ 1 ciclo con una sesión asignada |
| 6 | **Mira cómo le va** | Inicio («Necesitan atención») y Resumen de la ficha | **Entendido** en el cierre |

**Reglas de comportamiento [decidido]**

1. **El progreso se deriva de los datos** (atletas, ciclos, rutinas con ejercicios, ciclos con sesión). La única marca por cuenta es `tourStatus`; el resto vive en el navegador (por ejemplo, los pasos saltados y si vio el Resumen).
2. **Saltar y volver:** **Saltar paso** (en los pasos que se pueden), **Salir de la guía** (`skipped`), **Esc** pausa (queda un chip «Seguir»), **Alt + G** lleva el foco al globo y **← / →** cambian de marca.
3. **La espera es una pausa, no una pantalla.** La coach sigue usando la app; el chip dice «Guía · Paso 2 de 6 · Esperando a {Nombre}», y cuando la atleta acepta la guía retoma en el paso 2 (**Crea su ciclo**).
4. **Navegar por cuenta propia no rompe la guía:** la marca se oculta y aparece el chip «Volver al paso N»; si llega a la pantalla de otro paso, salta a ese paso.
5. **Se ofrece solo a coaches nuevas.** Una coach con datos previos no la ve.
6. **Reabrir:** **Cómo usar Cycles** en el menú de usuario vuelve a poner `pending`.
7. **Cierre:** al asignar la primera sesión, la coach ve «{Nombre} ya puede entrenar» (aviso de la pizarra, §5.4); el paso 6 (**Mira cómo le va**) termina con **Entendido** y guarda `completed`.

**Señales de éxito:** tiempo desde el primer ingreso hasta el primer ciclo con una sesión asignada; % de coaches que lo logran en 7 días; % que termina o salta la guía.

### 5.2 Atleta (acepta en el navegador, entrena en la app iOS)

**Hecho [decidido 2026-10-06]:** la atleta entrena con la app iOS; las atletas con Android usan la web del celular hasta que exista la app (instrucciones de «agregar a la pantalla de inicio» en el traspaso).

**Parte de:** la invitación de su coach (o su propio registro). **Primer valor:** primera sesión registrada de principio a fin en la app.

| Paso | Qué hace | Estado |
|---|---|---|
| A1 | Abre el correo de invitación | [hecho]: nombra a su coach (invitación en producción). |
| A2 | Define contraseña (o acepta la invitación si ya tiene cuenta) | [hecho]: «Activa tu cuenta» / «Acepta la invitación». |
| A3 | **Traspaso web → app** | [hecho, CYC-191/CYC-194]: «Tu cuenta está lista», **iPhone** (TestFlight con el correo de su Apple ID) o **Android** (agregar a la pantalla de inicio); si la API conoce su teléfono (`phonePlatform`), salta el selector. Botón **Seguir en el navegador**. |
| A4 | Instala la app y entra | [hecho]: login con correo y contraseña, Apple o Google. |
| A5 | Aún no tiene ciclo | [hecho en web]: «Falta tu coach» o «Tu coach está preparando tu ciclo». En la app, ver §6. |
| A6 | **Tour de la app** | [hecho, CYC-192]: tres marcas sobre la interfaz real (§11.2). |
| A7 | **Pista de la primera serie** y **cierre de la primera sesión** | [hecho, CYC-192]: una sola vez cada una («Primera sesión guardada. Tu coach ya puede verla.»). |

**Tour del atleta en la web [decidido; PR #188 abierto, CYC-233]:** el mismo mecanismo de marcas, con **tres marcas sobre el menú** (Hoy, Calendario, Mis ciclos) y los textos de la tarjeta anterior; reemplaza a `AthleteTourCard` y a la lista fija de `GuidePanel`. `tourStatus` lo comparten web y app: terminar en una no repite en la otra.

**Riesgos del traspaso:** la atleta acepta y nunca instala; instala pero olvida con qué correo entra; la web que ve tras aceptar parece «la app» y no vuelve. A3 cierra las tres (correo visible, pasos claros, y el aviso de que entrena desde la app).

**Señales de éxito:** % de atletas invitadas que aceptan en 7 días; tiempo desde aceptar hasta primera sesión registrada.

### 5.3 Equipo (piloto)

**Parte de:** una coach del piloto recién agregada. **Primer valor:** saber en qué punto está cada persona y poder ayudarla a tiempo.

- **Hoy [hecho]:** el **portal del equipo** (`apps/admin`, CYC-193) muestra Usuarios (reales y demo separados, con último ingreso) y Uso de PostHog por persona y por pantalla; los avisos de actividad llegan a `#cycles-actividad`; `docs/ONBOARDING.md` Parte 3 trae la lista previa y el recorrido de prueba.
- **Eventos de la guía [hecho]:** `tour_completed` y `tour_skipped` (con el paso en que ocurrió), además de los eventos de §9.
- **[diferido]:** una vista del embudo por coach (registrada → atleta invitada → atleta activa → ciclo con sesión → primera sesión). Se retoma después del piloto, sin datos de salud ni de rendimiento.

### 5.4 Un ciclo nace activo [decidido 2026-11-04; sustituye a la «activación automática» de 2026-10-06]

La versión 0.3 proponía que un plan pasara de **Borrador** a **Activo** al asignar su primera sesión. En la app actual **ya no existe el Borrador**: un ciclo nace **activo** (`CycleStatus`: `active`, `completed`, `archived`). Entonces:

| Tema | Regla |
|---|---|
| Qué cuenta como listo | Lo que importa es la **primera sesión asignada**: sin sesiones, la atleta no tiene qué ver en Hoy. |
| Aviso a la coach | Al asignar la primera sesión, la coach ve «Tu atleta ya puede entrenar» (cierre de la guía y aviso de la pizarra). |
| Atleta ve un ciclo a medias | Con la primera sesión asignada, ya lo ve en Hoy; la coach puede seguir completando la pizarra. |
| Ciclos ya existentes | Sin cambios. |
| Macrociclos | No tienen pizarra propia; agrupan otros ciclos. Sin cambios. |

## 6. Estados vacíos

Se conservó lo que ya existía y se diseñó lo que faltaba (CYC-75 coach, CYC-76 atleta).

| Pantalla | Rol | Texto | Estado |
|---|---|---|---|
| Inicio, sin atletas | Coach | Franja «Empieza invitando a un atleta» | [hecho] |
| Biblioteca vacía | Coach | «Tu biblioteca está vacía»; **Crear rutina** y **Crear ciclo** | [hecho] |
| Atletas, sin atletas | Coach | Formulario abierto «Invita a tu primer atleta» | [hecho] |
| Ejercicios, Míos vacío | Coach | «Todavía no creaste ejercicios» | [hecho] |
| Crear ciclo, sin atletas activos | Coach | «Falta que tu atleta acepte» | [hecho] |
| Hoy, sin coach | Atleta (web y app) | «Falta tu coach» | [hecho] |
| Hoy, con coach y sin ciclo | Atleta (web) | «Tu coach está preparando tu ciclo» | [hecho en web]; **[pendiente en la app]**: hoy dice «No tienes una sesión pendiente» para ese caso |
| Hoy, con ciclo y sin sesión pendiente | Atleta (web) | «Hoy no tienes sesión» / «Descansa.» | [hecho en web]; **[pendiente en la app]** |
| Mis ciclos | Atleta (web) | «Aún no tienes ciclos» | [hecho] |
| Calendario y Resumen | Atleta (app) | «Aún no tienes un ciclo activo» | [hecho] |

## 7. Correos del recorrido

| Correo | Cuándo | Estado |
|---|---|---|
| Verificación de email | Registro de coach o de atleta | [hecho] en producción |
| Invitación de atleta | La coach invita | [hecho] en producción; el atleta que se registra solo recibe además la invitación a TestFlight (CYC-194) |
| Recuperación de contraseña | «¿Olvidaste tu contraseña?» | [hecho]; fuera de este PRD |
| Bienvenida a la coach | Primera vez que entra | **[diferido]**: la guía en pantalla cumple esa función; se reevalúa tras el piloto |
| Recordatorio de invitación sin aceptar | A los 3 días | **[diferido]**: se reevalúa con los datos de aceptación del piloto |

Todos usan la plantilla con el motivo de la cadena de proteína (`docs/brand/identidad-visual.md`).

## 8. Diseño

Todo lo diseñado está aprobado y documentado en `docs/diseno/`:

- [x] Guía de la coach sobre la interfaz real, con tarjeta «Así se arma un ciclo» y orden de arriba hacia abajo: [`tour-primer-uso`](../diseno/tour-primer-uso/README.md) (v3.1) y su maqueta `propuestas.html`; capturas de cada paso en `capturas/`.
- [x] Chip de espera, «Cómo usar Cycles» y estados de la guía (mismo documento).
- [x] Traspaso web → app (iPhone y Android).
- [x] Estados vacíos de coach y atleta (CYC-75, CYC-76).
- [x] Tour móvil (M1–M5), pista de la primera serie y cierre de la primera sesión.
- [x] Guía del atleta en la web (tres marcas sobre el menú).
- [ ] Ajuste de los textos vacíos de **Hoy** en la app (ver §6; pendiente de desarrollo, no de diseño).

Referencias: `docs/brand/identidad-visual.md`, `docs/brand/especificaciones-diseno.md`, escala de radios 6/8/10 (CYC-206), isla de cuatro íconos.

## 9. Medición

Respeta las reglas de seguridad y privacidad (`docs/SEGURIDAD.md`, R1–R12): **nada de datos de salud ni de rendimiento** en métricas o avisos. PostHog en la web, sin cookies, persona identificada por ID interno y rol (`docs/deploy/POSTHOG.md`).

Eventos del recorrido [hecho]: `coach_registered`, `athlete_registered`, `login_succeeded`, `athlete_invited`, `athlete_joined`, `routine_created`, `cycle_created`, `routine_assigned`, `session_closed`, `tour_completed`, `tour_skipped`.

Embudo: `registro → atleta_invitada → atleta_activa → ciclo_creado → rutina_asignada (primera sesión) → primera_sesion_registrada`. La app móvil **no** se mide todavía (PostHog solo está en la web); `session_closed` de la app se infiere con consultas a la base.

## 10. Preguntas cerradas y diferidas

| # | Pregunta | Resolución |
|---|---|---|
| 1 | ¿Checklist o asistente? | **Cerrada:** ni uno ni otro; **marcas sobre la interfaz real** (§5.1). |
| 1b | ¿Formularios embebidos o reducidos? | **Cerrada:** se usan las **pantallas reales** (sin formularios propios de la guía). |
| 1c | ¿La rutina parte vacía o con plantilla? | **Cerrada:** parte vacía; la coach la crea en el cajón de la pizarra. |
| 2 | ¿App o navegador? | **Cerrada:** app iOS; Android por la web del celular por ahora. |
| 2b | ¿Cómo se instala la app iOS? | **Cerrada:** **TestFlight**, con invitación al correo de su Apple ID (CYC-194). |
| 2c | ¿Se puede abrir la app desde el navegador? | **Diferida:** hoy el traspaso **indica** instalar y entrar; un enlace universal se evalúa cuando haya App Store. |
| 2d | ¿Aceptar la invitación dentro de la app? | **Descartada** (cambio mayor). |
| 3 | ¿Activación automática? | **Cerrada y reemplazada:** el ciclo **nace activo** (§5.4). |
| 4 | ¿Correo de bienvenida o de recordatorio? | **Diferida** (§7). |
| 5 | ¿Seguimiento por persona del equipo? | **Parcial:** portal del equipo (§5.3); el embudo por coach, **diferido**. |
| 6 | ¿Eventos propios o consultas? | **Cerrada:** eventos de PostHog en la web (§9) y consultas para la app. |
| 7 | ¿Rutina o ciclo de ejemplo precargado? | **Descartada**: fuera de alcance. |

## 11. Plan de ejecución (para el desarrollo)

### 11.0 Estado por pieza

| Pieza | Tarjeta | Estado |
|---|---|---|
| API: `tourStatus` y `phonePlatform` | CYC-191 | [hecho] |
| Guía de la coach en la web (primera versión) | CYC-191 | [hecho]; reemplazada visualmente por la siguiente |
| Guía de la coach como capa de marcas (v3.1) | CYC-214 | [hecho] |
| Arreglo del bucle: «Crear ciclo» de un atleta sin plan abre «Nuevo ciclo» con el atleta fijado | CYC-234 (PR #185) | [hecho] |
| Isla de pestañas con la guía | CYC-229 | [hecho] |
| Tour en la app móvil | CYC-192 | [hecho] |
| Guía del atleta en la web como marcas sobre el menú | CYC-233 (PR #188) | **[pendiente]**: PR abierto; falta revisión de la usuaria en web móvil y escritorio |
| Textos vacíos de **Hoy** en la app (§6) | CYC-76 (móvil) | **[pendiente]** |
| Portal del equipo (Usuarios y Uso) | CYC-193 | [hecho] |

### 11.1 API de la guía de primer uso (CYC-191, 2026-11-03)

Una sola marca por cuenta, compartida por web y móvil (diseño en `docs/diseno/tour-primer-uso`, decisión D7). Todo lo demás se deriva de los datos.

- `User.tourStatus`: `pending` (por defecto, también para las cuentas que ya existían) · `skipped` · `completed`. Migración aditiva `20261103170000_estado_guia_primer_uso`.
- `GET /users/me` devuelve `tourStatus` y `phonePlatform` (`ios` / `android` / `null`: lo que el atleta eligió al registrarse solo; con él el traspaso web → app salta el selector).
- `PATCH /users/me/tour` con `{ "status": "pending" | "skipped" | "completed" }` → 204. `pending` sirve para «Volver a ver la guía». 400 si el valor no existe; 401 sin sesión.
- Sale en la exportación de datos de la cuenta y se borra con ella.

### 11.2 Guía de primer uso en la app móvil (CYC-192, 2026-11-03)

Diseño v3.1 «Tour móvil», ajustes M1–M5. Solo atletas, sobre la interfaz real (sin velo ni pantallas propias):

- **Tres marcas** con halo azul y un globo corto (`#1f2228`, radio 10, hasta 12 palabras, **Siguiente** y **Saltar**): **Inicio** (el botón real de la sesión, nombrado con su texto: «Toca Iniciar rutina cuando vayas a entrenar.»; sin sesión se señala la tarjeta vacía: «Aquí aparecerá tu sesión de hoy.»), **Calendario** y **Resumen** (íconos de la isla, «Toca Calendario.» / «Toca Resumen.»). El Asistente queda fuera mientras sea demo.
- El halo **no bloquea toques** y no se atenúa el resto de la pantalla. Avanzan al tocar el botón o la pestaña, o con **Siguiente**; tocar Resumen termina la guía.
- Aparece con `tourStatus = pending`, después de la bienvenida, solo sobre las pestañas. **Saltar** guarda `skipped`; terminar guarda `completed`. **Cómo usar Cycles** (menú del avatar) vuelve a pedirla (`pending`) y lleva a Inicio. Se guarda con `PATCH /users/me/tour`; si falla, la pantalla igual cambia y la guía puede repetirse una vez.
- **Pista de la primera serie** (una sola vez, en el registro de serie) y **cierre de la primera sesión** («Primera sesión guardada. Tu coach ya puede verla.», una sola vez, solo al cerrar como hecha). Ambas marcas viven en el dispositivo (`cycles.hint.firstSet`, `cycles.hint.firstSession`).
- Código: `store/TourContext.tsx` (estado y anclas), `components/tour/` (capa, ancla, pistas). Texto sin movimiento propio; el globo se anuncia a los lectores de pantalla.

### 11.3 Guía de la coach en la web (CYC-191 y CYC-214)

- **Lógica pura:** `apps/web/src/lib/tour.ts` deriva el avance de los datos (`TourCounts`: invitados, atletas activos, ciclos del atleta, rutinas, rutinas con ejercicios, ciclos con sesión) y guarda en el navegador solo lo local (`started`, pasos saltados, Resumen visto, pausa). La única marca en el servidor es `tourStatus`.
- **Capa:** `components/tour/TourLayer.tsx` (halo, globo, chip, teclado: Esc, Alt + G, flechas), `TourIntro.tsx` (tarjeta «Así se arma un ciclo»), `GuidePanel.tsx` (**Cómo usar Cycles**) y `AppHandoff.tsx` (traspaso web → app).
- **Anclas** `data-tour` en los elementos señalados (menú, botones, formularios); si la persona está en otra pantalla o el elemento no está, la guía muestra el chip **Volver al paso N** en lugar de romperse.
- **Eventos:** `tour_completed` y `tour_skipped` con el paso.

### 11.4 Guía del atleta en la web (CYC-233, PR #188) [pendiente de revisión]

Reemplaza `AthleteTourCard` por tres marcas sobre el menú (Hoy, Calendario, Mis ciclos) con el mismo mecanismo y el mismo `tourStatus`. Aceptación: funciona con y sin ciclo asignado; «Entendido» marca `completed`, «Salir de la guía» marca `skipped`; **Cómo usar Cycles** vuelve a ponerla en `pending`; verificada por la usuaria en web móvil y escritorio.

### 11.5 Pendientes para el desarrollo

1. **Textos vacíos de Hoy en la app** (§6): «Tu coach está preparando tu ciclo» y «Hoy no tienes sesión» (CYC-76, móvil).
2. **Mezclar y verificar CYC-233.**
3. **Diferidos** (no bloquean `ready`): embudo por coach en el portal del equipo, correos de bienvenida y recordatorio, enlace universal de la app.

## 12. Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-10-06 | Esqueleto, brechas observadas B1–B7, recorridos propuestos por rol, preguntas abiertas |
| 0.2 | 2026-10-06 | Decidido: la coach usa un asistente paso a paso (no checklist). Se define W1–W5, pausa en W3, progreso derivado de los datos y reglas de comportamiento. Nuevas preguntas 1b y 1c |
| 0.3 | 2026-10-06 | Decidido: la atleta usa la app iOS y el plan se activa al asignar su primera sesión. Asistente de la coach pasa a 4 pasos (sin paso de activar). Recorrido de la atleta rehecho como traspaso web → app (A1–A7). Nueva §5.4. Preguntas 2b–2d |
| 0.4 | 2026-11-03 | Plan de ejecución: API de la guía (§11.1, CYC-191) y tour móvil (§11.2, CYC-192) |
| **1.0** | 2026-11-04 | **`status: ready`.** Guía como capa de marcas sobre la interfaz real con orden de arriba hacia abajo (v3.1, CYC-213), tarjeta «Así se arma un ciclo», tour móvil (M1–M5), guía del atleta en la web (CYC-233), traspaso con iPhone y Android, registro con dos roles, un ciclo nace activo (§5.4 reemplazada), estados vacíos con su estado real, portal del equipo, preguntas cerradas o diferidas y estado por pieza (§11.0). Se retiran el asistente W1–W4 y la tarjeta «Sigue donde quedaste» |
