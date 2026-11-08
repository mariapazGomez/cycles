---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 3 — Ejecución y seguimiento (seguimiento en Fase 3.5 — Piloto)"
created: 2026-09-25
updated: 2026-11-01
tags: [prd, feature/app-movil-atleta]
related: ["[[PRD-EjecucionYSeguimiento]]", "[[PRD-RutinasYProgramacion]]"]
---

# PRD — App móvil del atleta (iOS)

> Hijo de [[PRD-General]]. Adelanta parte de "Fase 4 — Evolución" (app móvil nativa, ver roadmap del PRD general) porque el registro de ejecución ([[PRD-EjecucionYSeguimiento]]) es mobile-first por diseño: el atleta registra durante el entrenamiento, en el gimnasio, con el celular en la mano.

## 1. Resumen

App nativa iOS (React Native, CLI bare — no Expo) para que el atleta vea la sesión que le toca y registre su ejecución serie por serie, siguiendo el flujo ya especificado en [[PRD-EjecucionYSeguimiento]]. No incluye nada del lado del coach (eso sigue siendo web).

## 2. Por qué un proyecto separado del monorepo web

`apps/mobile` vive en el mismo repo/monorepo (reutiliza `@cycles/shared` para los tipos de dominio), pero es un proyecto nativo independiente de `apps/web` — no comparte código de UI ni build. Se desarrolla en un git worktree aparte (`worktree-mobile-app`) para no interferir con el trabajo en curso del backend de Fase 3 (rama `feat/fase-3-backend`, con cambios sin commitear en el checkout principal).

## 3. Alcance

### Dentro de alcance

Lo que la primera iteración pedía (login, «Hoy», registro serie por serie con RIR y cierre de sesión) está construido, y la app creció con lo que pidió el piloto:

- **Login** del atleta con `POST /auth/login`. La app es solo para atletas: una cuenta de coach recibe el aviso de entrar por la web. Registro y creación de cuentas **no** existen en la app: el atleta activa su cuenta con la invitación (web).
- **Hoy:** la sesión pendiente del ciclo activo (`GET /me/today`), con campana de avisos y avatar.
  - **Estados vacíos (CYC-245), mismos textos que la web:** sin coach, «Falta tu coach»; con coach y ningún ciclo (`GET /cycles` vacío), «Tu coach está preparando tu ciclo» / «Cuando te asigne tu primera sesión, la verás aquí.»; con ciclo y sin sesión pendiente, «Hoy no tienes sesión» / «Descansa.». Si no se pueden leer los ciclos, se muestra «Hoy no tienes sesión».
- **Sistema visual de las vistas (CYC-258, `docs/diseno/vistas-app`):** base común de Hoy, Calendario y Resumen. **Perlas** (`components/pearl/`: `Pearl.tsx`, `kinds.ts`, `glyphs.ts` con pictogramas Phosphor «fill» incrustados como trazados SVG, sin paquete nuevo; MIT en `THIRD_PARTY_NOTICES.md`) y **tokens de color con sus reglas** en `theme/colors.ts` (`pearlColors`, `viewColors`) y `viewShadow` en `theme/elevation.ts`: el **azul es solo de la app** (botones, selección, anillo, enlaces y líneas de gráficos; ninguna perla va en azul); la **fuerza del coach va en verde**; lo del atleta en **naranja** (deportes y sus pesas), **violeta** (descanso y yoga), **tinta** (partido), **gris** (viaje y otro) y **rojo** (lesión, siempre con texto); el color nunca va solo y los componentes no escriben hex sueltos (hay una prueba que lo vigila). Las pantallas adoptan el fondo `#eef3fc` y la sombra azulada una por una (CYC-254, CYC-256). El modo nocturno es CYC-260.
- **Actividades paralelas (CYC-252, en curso; diseño CYC-237, API CYC-251):** el atleta agrega por su cuenta lo que hace fuera del plan (voleibol, partidos de liga…), sin depender del coach; se ven también sin ciclo ni coach. **Hecho (lógica, sin estilo final):** tipos compartidos en `@cycles/shared` (`AthleteEventOccurrence`, con la repetición ya expandida por la API y el campo opcional `sport`), `services/eventsApi.ts` (`/me/events`, lista por rango, crear, editar y borrar con alcance «solo este día» / «toda la serie»), `utils/eventCalendar.ts` (semana calendario lunes a domingo, cuadrícula y rango del mes, agrupar por día, «+N», resumen para Hoy), `utils/eventForm.ts` (validación, armado de la petición y resumen «Se agregan 6 lunes y 6 martes.»), `hooks/useEvents.ts` (el error de las actividades nunca esconde las sesiones), un formulario provisional (`components/events/EventForm.tsx`) y `components/events/eventKinds.ts`, que elige la perla de cada actividad (por `sport`; sin él, respaldo por nombre) sobre el sistema visual de CYC-258. **Falta:** el estilo final (tarjetas, vista de mes —CYC-254—, hoja de alta), el modo de calendario por fechas dentro de `CalendarScreen`, la fila de Hoy y la prueba con la API real.
- **Calendario:** el plan del atleta por semanas, con el detalle de cada sesión y el cambio de fecha (`PATCH /sessions/:id/schedule`).
  - **Vista de mes y actividades (CYC-254 y CYC-252):** interruptor **Semana | Mes** y botón **+** arriba. El mes (`components/calendar/MonthView.tsx`) es una cuadrícula de semanas de lunes a domingo con **una perla por actividad** (máximo dos; con más, una y «+N»; con letra grande, una sola), un punto por sesión del coach (oscuro = hecha, aro azul = pendiente), hoy resaltado y el día elegido con borde; celdas de 54 px mínimo, perlas de 19 px y números de 11 px. Debajo, el **detalle del día** (`DayDetail.tsx`: sesiones del coach primero, actividades después, con el estado en palabras). Funciona **sin ciclo ni coach** y pide `/me/events` con el rango del mes (≤ 42 días); si las actividades no cargan, el aviso con «Reintentar» es aparte y no esconde las sesiones. Tocar una actividad o «Agregar» abre la hoja (`EventSheet.tsx` + `EventForm`, aún con estilo provisional): crear, editar «solo este día» (la fecha queda fija) o «toda la serie», y eliminar; los errores de la API se traducen (`describeEventError`). La **vista de semana** suma las actividades: con ciclo hay un interruptor **Ciclo | Fechas**. En **Ciclo** (como antes) aparece debajo de las sesiones «Tus actividades esta semana», agrupadas por día. En **Fechas** (`components/calendar/WeekDatesView.tsx`) se ve la semana calendario de lunes a domingo con flechas y «Hoy», una tira de 7 días con las perlas de cada día y la lista por día con las sesiones del coach y las actividades; **sin ciclo solo existe este modo** (debajo, el vacío «Aún no tienes un ciclo activo»), y una semana vacía ofrece «Agregar actividad». El formulario ya tiene el estilo del diseño: chips de tipo y de deporte con su perla, intensidad con tres perlas y controles de 44 px o más. **Falta:** la fila «Hoy también» y el aviso del coach (CYC-256, PR aparte), y probar con la API desplegada, en dispositivo, con Dynamic Type y con TalkBack.
- **Registro por serie** (`ExerciseLog`, con RIR en la última serie), **temporizador de descanso** que guarda cuándo termina (`restTimerStorage`) y sigue exacto al volver de segundo plano, y **cierre de sesión** (esfuerzo, duración, dolor y nota).
- **Resumen:** arriba, la constancia del ciclo; después **«Cómo van tus ejercicios»** (CYC-241, `GET /me/exercise-progress`): una tarjeta por ejercicio hecho en 2 sesiones o más, con peso («60 → 70 kg», ▲ +10 kg) y repeticiones («6 → 5 reps», ▼ −1), cada uno con una línea pequeña; sin verde ni rojo, la flecha y el signo dicen la dirección. Orden: primero los que más cambiaron. Al tocar una tarjeta se abre el gráfico por sesión de lo planificado contra lo cargado (`PlanVsRealChart`, `react-native-svg`, texto ≥ 11 px, tarjeta oscura con perlas y banda). Peso corporal: solo repeticiones; sin plan: solo lo cargado. Estados: cargando (esqueletos), sin ejercicios repetidos («Cuando repitas un ejercicio, lo verás aquí»), error aparte del resto. Debajo, **«Qué músculos trabajas»** (plegado por defecto): reparto por grupo muscular por semana y por día, con mapa muscular (`GET /me/summary`). Las cifras grandes usan la fuente del sistema (peso 800); si se empaqueta Bricolage Grotesque se decide en CYC-246. Diseño: `docs/diseno/resumen-atleta/`.
- **Asistente:** conversación con atajos. Hoy responde con un texto provisorio (`services/assistantApi.ts`); la respuesta real depende del backend del asistente, aún sin construir.
- **Nota del coach por ejercicio** (CYC-63): el atleta ve la «Nota de tu coach» en «Hoy» (bajo el ejercicio), en el detalle de la sesión y arriba en el registro del ejercicio. Es texto libre que puede hablar de salud: solo se muestra en esas pantallas y no viaja en los avisos ([[SEGURIDAD]], R7). Componente `CoachNote`.
- **Avisos:** la lista de la campana (`/notifications`), con los textos y reglas de `docs/diseno/notificaciones`.
- **Privacidad:** aceptación versionada de los Términos y la Política (`PolicyAcceptanceScreen`, T-149), enlaces a ambos desde el avatar y, desde CYC-107, **Mi cuenta** para retirar el consentimiento de estadísticas, descargar los datos y eliminar la cuenta (requisito de Apple 5.1.1(v), ver [[PRD-PrivacidadYTerminos]] §8).
- **Navegación:** cuatro pestañas (Calendario, Hoy, Resumen, Asistente) en una isla flotante de tamaño fijo con transición deslizante entre pestañas (CYC-185); las pantallas a pantalla completa (registro de serie, cierre de sesión, avisos, cuenta) no la muestran. Respeta «reducir movimiento».
- **Marca:** colores del logo (`apps/mobile/src/theme/colors.ts`), animación de inicio y diseño compacto (`docs/diseno/personalidad-app`).

### Fuera de alcance

- Todo lo de coach (queda en la web).
- Notificaciones push y wearables (Fase 4).
- Modo offline completo: solo tolerancia a reintentos (el `id` de cada serie lo genera el cliente, así un reintento no duplica).
- Ver sesiones de otras personas o editar el plan: el atleta solo registra y reprograma.

## 4. Dependencias

- **Backend de [[PRD-EjecucionYSeguimiento]]:** ya en `main` y en producción (`https://api.getcycles.app`). Las compilaciones Release usan esa URL; en desarrollo la app usa la API local (`apps/mobile/src/config/env.ts`; en Android el emulador ve la máquina como `10.0.2.2`).
- **Autenticación:** mismo login y refresh que la web ([[PRD-Autenticacion]]). Los tokens se guardan en el Keychain de iOS (Keystore en Android) y, si el refresh falla de verdad, la app vuelve al login (CYC-103); un fallo de red no cierra la sesión.
- **Privacidad:** [[PRD-PrivacidadYTerminos]].

## 5. Estado

**En construcción, lista para probar con atletas reales; todavía no publicada.**

- **Hecho:** todo lo de «Dentro de alcance». Pruebas automáticas con Jest (19 suites en `main` al 2026-11-01, `apps/mobile/__tests__`) y typecheck. Los flujos se han ido probando a mano en el simulador; desde el 2026-10-02 la app también se prepara para instalarse en un celular con la API de producción.
- **Android:** ya no es «para después». Existe el proyecto, el flujo de GitHub Actions que compila y abre la app en un emulador (`.github/workflows/android.yml`) y la guía `docs/ANDROID.md`. Falta probarlo en un teléfono real y publicar (`docs/deploy/PUBLICAR-ANDROID.md`).
- **iOS:** identificador `app.getcycles.mobile`, equipo de firma de la cuenta de Apple Developer y el validador de subidas (`npm run ios:check`, ver `docs/deploy/PUBLICAR-IOS.md`). **`apps/mobile/ios/subidas.json` está vacío: aún no se ha registrado ninguna compilación en TestFlight.** Antes de publicar falta, entre otras cosas, la declaración de privacidad de la ficha de App Store.
- **Sin probar en un dispositivo:** la pantalla «Mi cuenta», la aceptación de la política y el cierre de sesión por refresh vencido (ver `docs/PRUEBAS-PENDIENTES.md`, P-23).
- **Decisión resuelta:** la app **no** reusa tal cual el diseño de la web; comparte la paleta y la marca (colores del logo) y tiene su propio lenguaje táctil (rediseño del 2026-10-02: isla flotante, tarjetas sobre fondo de la app).
- **Pendiente:** respuestas reales del asistente; `API_URL` de staging si se necesita; manejo de errores globales y reporte de caídas (`docs/DEUDA-TECNICA.md`, ítem 11).
