---
type: plan
tags: [seguridad, plan]
status: draft
created: 2026-09-26
updated: 2026-09-26
---

# Plan de correcciones de seguridad

> Plan **sin ejecutar** para corregir los hallazgos de la auditoría del 2026-09-26 ([`docs/SEGURIDAD.md`](SEGURIDAD.md) §3). Cada corrección cita el hallazgo (S-xx) y la regla que protege (R-x), dice qué archivos toca y cómo se prueba. Al terminar cada una, se marca el hallazgo como resuelto en `SEGURIDAD.md`.

## Resumen y orden

Tres tandas, de mayor a menor urgencia. Cada PR es chico y se puede revisar solo.

| Tanda | Cuándo | PR | Hallazgos | Esfuerzo estimado |
|---|---|---|---|---|
| **1** | Antes de abrir el piloto | **1A** Dependencias | S-03 | Medio |
| | | **1B** Endurecer la API | S-01, S-04, S-05, S-06, S-07 (API) | Medio |
| | | **1C** Login con Google sin tokens en la URL | S-02 | Medio |
| | | **1D** Cabeceras de la web en Vercel | S-07 (web) | Bajo, junto con el paso 4 del plan de deploy |
| | | **1E** Alertas de seguridad a Slack | Detección (complementa S-01 y R2) | Medio |
| **2** | Antes de sumar más usuarios | **2A** Refresh token en cookie `httpOnly` | S-08 | Alto |
| | | **2B** Tokens de la app móvil en el Keychain | S-09 | Bajo, en la rama de la app móvil |
| | | **2C** Tests de autorización y CI | S-11 | Medio |
| **3** | Mejoras planificadas | **3A** Igualar tiempos del login | S-10 | Bajo |
| | | **3B** Append-only a nivel de base de datos | S-12 | Bajo |

**Por qué 1A va primero:** al actualizar dependencias puede cambiar el comportamiento de NestJS. Conviene que los demás cambios se prueben ya sobre las versiones nuevas.

**Relación con el deploy:** la tanda 1 completa es condición para abrir el piloto (paso 7 de `docs/deploy/PLAN-Deploy.md`). 1B y 1C pueden hacerse mientras se configuran Supabase, Render y Vercel; 1D se hace dentro del paso 4.

---

## Tanda 1 · Antes del piloto

### 1A · Dependencias (S-03 · R11)

**Situación:** `npm audit --omit=dev` marca 16 vulnerabilidades. Casi todas se corrigen solo con **saltos de versión mayor** (NestJS 10 → 12, `react-router-dom` 6 → 7, `bcrypt` 5 → 6), así que no alcanza con `npm audit fix`.

**Plan, de lo más barato a lo más caro:**

1. **Quitar `@nestjs/swagger`:** está instalado pero no se usa en ningún archivo. Elimina `js-yaml` y `lodash` (2 altas) y una moderada.
2. **`bcrypt` 5 → 6:** la API que usamos (`hash`, `compare`) no cambia. Elimina `tar` (crítica, solo de compilación) y `@mapbox/node-pre-gyp` (alta). Alternativa: `bcryptjs`, en JavaScript puro, sin compilación nativa, lo que además simplifica el build en Render.
3. **Transitivas de NestJS con `overrides`** en el `package.json` raíz: forzar las versiones corregidas de `multer`, `body-parser`, `qs` y `file-type` sin cambiar la versión mayor de NestJS. Hay que verificar que cada versión forzada sea compatible con `@nestjs/platform-express` 10 (sus tests de arranque y upload).
4. **`react-router-dom` 6 → 7:** v7 es mayormente compatible con v6 si se activan antes sus *future flags*. Rutas a revisar: `App.tsx`, `ProtectedRoute`, `PublicOnlyRoute`, y los `useNavigate` y `Link` de las páginas.
5. **Migrar NestJS 10 → 11/12** queda **fuera** de esta tanda si los overrides alcanzan. Se agenda como tarea propia, porque cambia más cosas (Express 5, cambios de rutas, configuración).

**Se prueba con:**
- `npm audit --omit=dev`: sin altas ni críticas, o con cada excepción anotada y justificada en `SEGURIDAD.md`.
- Typecheck y build de web y API.
- Recorrido manual: login, refresh de sesión, invitación, registro de una sesión y pantallas del coach.

**Riesgo:** los overrides pueden romper algo sutil de NestJS 10. Si pasa, se cae al paso 5 (migración de NestJS).

---

### 1B · Endurecer la API (S-01, S-04, S-05, S-06, S-07 · R1, R3, R5, R8, R11)

Un solo PR, porque son cambios chicos en los mismos archivos de arranque (`main.ts`, `app.module.ts`).

#### Límite de intentos (S-01)

- Agregar `@nestjs/throttler` con un guard global y límites por ruta:

  | Ruta | Límite propuesto | Clave |
  |---|---|---|
  | Todas | 100 pedidos / minuto | IP |
  | `POST /auth/login` | 5 / minuto y 20 / hora | IP + email |
  | `POST /auth/register` | 5 / hora | IP |
  | `POST /auth/verify-email/resend`, `POST /auth/password-reset/request` | 3 / hora | email (y 10 / hora por IP) |
  | `POST /athletes/invite` | 20 / hora | coach |
  | `POST /auth/refresh` | 30 / minuto | IP |

- La clave por email o por coach necesita un *tracker* propio (sobrescribir `getTracker` del guard), porque por defecto el throttler solo cuenta por IP.
- **Detrás del proxy de Render** hay que activar `trust proxy`; si no, todos los pedidos parecen venir de la misma IP y el límite bloquea a todos a la vez.
- La respuesta al superar el límite es **429** con un mensaje claro ("Hiciste demasiados intentos. Espera unos minutos y vuelve a probar."). En recuperación y reenvío, el 429 no debe revelar si el email existe (R3).
- El almacenamiento en memoria alcanza con una sola instancia en Render. Si algún día hay varias, pasa a Redis (anotarlo en `SEGURIDAD.md`).
- Los límites son valores iniciales: van como constantes para ajustarlos fácil.

#### CORS (S-04)

- `enableCors` con `origin` limitado a una lista que viene de una variable (`CORS_ORIGINS`, por defecto `FRONTEND_URL`). En desarrollo, `http://localhost:5173`. La app móvil nativa no necesita CORS.

#### Coach sin acceso cuando la relación no está activa (S-05)

- Un helper compartido (por ejemplo en `common/`) que verifique la relación coach-atleta activa, usado en:
  - `cycles.service.ts`: `assertAccess`, `update`, `getChildren`;
  - `sessions.service.ts`: `assertCycleAccess`, `getSessionForCoach`, `getSessionExerciseForCoach`.
- El atleta conserva siempre el acceso a lo suyo (R5.2), así que el chequeo aplica solo al coach.
- `tracking` y `execution` ya lo hacen: reutilizar el mismo helper para no duplicar la lógica.

#### Validar variables de entorno al arrancar (S-06)

- `ConfigModule.forRoot({ validate })`, usando `class-validator`, que ya está instalado.
- Siempre obligatorias: `DATABASE_URL`, `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (distintos entre sí y de al menos 64 caracteres), y `FRONTEND_URL`.
- Con `NODE_ENV=production`, obligatorias además: `RESEND_API_KEY`, `MAIL_FROM`, `CORS_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_CALLBACK_URL`.
- Si falta alguna, la API **no arranca** y el error dice cuál falta, sin mostrar su valor.
- `MailService` **nunca** entra en modo desarrollo con `NODE_ENV=production`: así se evita que los enlaces con token terminen en el log (R8).

#### Cabeceras de seguridad en la API (S-07, parte API)

- Agregar `helmet` en `main.ts`. La API solo devuelve JSON, así que la configuración por defecto sirve. Verificar que no rompa el redirect de Google.

**Se prueba con (1B completo):**
- Pedidos repetidos a cada ruta limitada hasta obtener 429, y verificar que otra IP u otro email no quedan bloqueados.
- Un pedido desde un origen no permitido recibe un error de CORS en el navegador.
- Un coach con la relación pasada a `inactive` recibe 403 en plan, sesión, grid y edición; el atleta sigue viendo lo suyo.
- La API no arranca sin `JWT_ACCESS_SECRET`, ni sin `RESEND_API_KEY` en modo producción.
- Las cabeceras de `helmet` aparecen en las respuestas.

---

### 1C · Login con Google sin tokens en la URL (S-02 · R2, R8)

**Hoy:** el callback de Google redirige a `/oauth-callback?accessToken=…&refreshToken=…`.

**Propuesto:** intercambio con un código de un solo uso.

1. **Tabla nueva `OAuthExchangeCode`:** hash del código, `userId`, `expiresAt` (60 segundos) y `usedAt`. Migración nueva.
2. **El callback** crea un código aleatorio de 32 bytes, guarda solo su hash y redirige a `/oauth-callback?code=…`.
3. **Endpoint nuevo `POST /auth/google/exchange`** con `{ code }`: valida que exista, no esté usado ni vencido, lo marca usado y devuelve el par de tokens. Un código inválido, usado o vencido responde siempre el mismo 401.
4. **`OAuthCallbackPage`** manda el código con `POST`, guarda los tokens y reemplaza la URL (`navigate(…, { replace: true })`) para que el código tampoco quede en el historial.
5. Sumar `Referrer-Policy: no-referrer` en la web (1D) como segunda barrera.
6. Rate limit del endpoint de intercambio (usa el mismo throttler de 1B).

**Se prueba con:**
- Un login con Google de punta a punta.
- Reusar el mismo código da 401.
- Un código de más de 60 segundos da 401.
- La URL final no tiene código ni tokens.
- Ningún token aparece en el log de la API.

**Nota:** requiere credenciales de Google (paso 5 del plan de deploy) para probar de punta a punta. Mientras tanto se prueba con tests del servicio.

---

### 1D · Cabeceras de la web en Vercel (S-07, parte web · R10)

Va dentro del paso 4 del plan de deploy: un `vercel.json` en `apps/web` con:

| Cabecera | Valor propuesto |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; connect-src 'self' https://api.getcycles.app; font-src https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `Referrer-Policy` | `no-referrer` |
| `X-Content-Type-Options` | `nosniff` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | La pone Vercel; `.app` además obliga a usar HTTPS |

- `'unsafe-inline'` en estilos hace falta porque las pantallas usan atributos `style` de React. No abre la puerta a scripts: `script-src` sigue siendo solo `'self'`.
- **Wake Lock y vibración** (descanso entre series) no necesitan permisos en esta política.

**Se prueba con:** la consola del navegador sin errores de CSP, recorriendo todas las pantallas, y una revisión en securityheaders.com.

---

### 1E · Alertas de seguridad a Slack (complementa S-01 · R2, R8)

**Objetivo:** enterarse de un ataque o de un comportamiento sospechoso **en el momento**, sin revisar los logs de Render. Las defensas ya existen (límite de intentos, detección de reuso de sesión); 1E avisa cuando se activan de una forma que no parece un usuario equivocándose.

**Canal:** un *incoming webhook* de Slack hacia un canal privado, por ejemplo `#cycles-seguridad`. Slack y no email: llega al instante, no gasta la cuota ni la reputación de Resend (que envía las invitaciones) y sirve para un equipo.

**Qué se alerta.** No cada 429: un usuario que se equivoca de contraseña 6 veces también lo genera, y el canal se volvería ruido.

| Evento | Regla inicial | Nivel |
|---|---|---|
| **Reuso de un refresh token ya rotado** (ya se detecta y cierra todas las sesiones) | Cada vez | Alta |
| **IP que prueba muchos emails distintos** en el login | ≥ 10 emails distintos desde una IP en 10 min | Alta |
| **Cuenta atacada desde varias IPs** | ≥ 10 logins fallidos contra un mismo email en 15 min, desde ≥ 3 IPs | Alta |
| **IP bloqueada repetidamente** por el límite de intentos | ≥ 3 bloqueos (429) de la misma IP en 10 min | Media |
| **Pico de emails no enviados** por Resend | ≥ 5 fallas de envío en 15 min | Media |

Los umbrales son iniciales: van como constantes, igual que los límites de 1B.

**Qué dice cada alerta:** el evento, el nivel, la hora (UTC y hora local), la IP, la cuenta afectada con el email parcialmente oculto (`lu***@gmail.com`), cuántas veces pasó en la ventana y la ruta. **Nunca** contraseñas, tokens ni enlaces con token (R8).

**Cómo se implementa:**
1. **`SecurityAlertService`** (en `common/`) con un método por evento y un **contador en memoria por ventana de tiempo**, igual que el throttler (alcanza con una instancia). Si algún día hay varias instancias, pasa a Redis.
2. **Anti-inundación:** como máximo 1 alerta por patrón y por IP o cuenta cada 15 min. Si se repite, la siguiente alerta dice cuántas veces pasó mientras tanto. Así un atacante no puede llenar el canal.
3. **Puntos de enganche:**
   - `ThrottlerGuard` (sobrescribir `throwThrottlingException`) para los bloqueos por IP;
   - `AuthService.login` para los logins fallidos;
   - `AuthService.refresh` para el reuso;
   - `MailService.deliver` para las fallas de envío.
4. **Envío a Slack sin bloquear la respuesta:** la alerta sale en segundo plano, con un timeout corto. Si Slack falla o no está configurado, la alerta queda en el log y la API sigue normal.
5. **Variable nueva `SLACK_SECURITY_WEBHOOK_URL`:** es un secreto (R1). Va en `.env` y en Render, y se documenta en `.env.example` sin valor. Es opcional incluso en producción, porque sin ella las alertas quedan en el log.

**Lo que haces tú:** crear el canal privado en Slack, agregar la app *Incoming Webhooks* (o una app propia de Slack con esa función) apuntando al canal y guardar la URL en el gestor de contraseñas.

**Se prueba con:**
- Forzar cada evento en local (logins fallidos con muchos emails desde una IP, reuso de un refresh, key de Resend inválida) y ver que llega una sola alerta por patrón, con el formato esperado y sin datos sensibles.
- Sin webhook configurado, la API responde igual y la alerta queda en el log.

**Relación con los avisos de actividad:** usa la misma integración con Slack que los avisos de actividad del piloto (`docs/deploy/PLAN-Deploy.md`, paso 8), pero con otro canal y otra variable, para que las alertas de seguridad no se pierdan entre los avisos de actividad.

---

## Tanda 2 · Antes de sumar más usuarios

### 2A · Refresh token en cookie `httpOnly` (S-08 · R2)

- La API entrega el **refresh token en una cookie** `httpOnly`, `Secure`, `SameSite=Strict`, con `Path=/auth`. El access token queda **solo en memoria** en la web.
- `app.getcycles.app` y `api.getcycles.app` son el mismo *site* (`getcycles.app`), así que `SameSite=Strict` funciona. CORS pasa a `credentials: true` con la lista de orígenes de 1B.
- Al cargar la página, la web pide un access token nuevo con `POST /auth/refresh` usando la cookie.
- **Protección CSRF:** `SameSite=Strict`, más verificar el encabezado `Origin` en `/auth/refresh` y `/auth/logout`.
- La **app móvil** sigue mandando el refresh token en el body (no usa cookies): el endpoint acepta ambos caminos.

**Se prueba con:** el refresh tras recargar la página, el logout que borra la cookie, un pedido desde otro origen rechazado y que el token no se vea en `localStorage`.

### 2B · Tokens de la app móvil en el Keychain (S-09 · R2)

- En la rama `worktree-mobile-app`, cambiar `AsyncStorage` por `react-native-keychain`, que usa el Keychain de iOS, en `apps/mobile/src/services/tokenStore.ts`. Mantener la interfaz del `tokenStore` para no tocar las pantallas.
- Hacerlo **antes de mergear o publicar** la app. Coordinarlo con la sesión que trabaja en esa rama.

### 2C · Tests de autorización y CI (S-11 · R12)

- **Tests e2e de la API** (Jest + supertest) contra una base de prueba, con una matriz por endpoint:

  | Caso | Resultado esperado |
  |---|---|
  | Sin sesión | 401 |
  | Rol equivocado | 403 |
  | Coach que no es dueño | 403 |
  | Relación inactiva | 403 |
  | Atleta sobre datos de otro atleta | 403 |

  Además, tests de los flujos de token: reuso de refresh, código de Google usado, reset vencido.
- **CI en GitHub Actions**, en cada PR: `npm ci`, `prisma generate`, typecheck y build de web y API, los tests con Postgres como servicio, `npm audit --omit=dev --audit-level=high`.
- Instalar ESLint, que hoy falta aunque existe el script `lint`.

---

## Tanda 3 · Mejoras planificadas

### 3A · Igualar tiempos del login (S-10 · R3)

Cuando el email no existe, igual comparar la contraseña contra un hash bcrypt ficticio, para que la respuesta tarde lo mismo que con un email existente. Son unas pocas líneas en `auth.service.ts`.

### 3B · Append-only en la base de datos (S-12 · R7)

Migración con un trigger de Postgres que rechace `UPDATE` y `DELETE` sobre `ExerciseLog` y `SessionFeedback`. Hay que revisar que ningún flujo actual los necesite: quitar un ejercicio con registros ya está bloqueado en la app. Documentar cómo borrar datos si algún día se pide por privacidad (un procedimiento manual y controlado).

---

## Seguimiento

| PR | Hallazgos | Estado |
|---|---|---|
| 1A Dependencias | S-03 | **Hecho** (2026-09-27): de 16 vulnerabilidades a 1 moderada aceptada (`@nestjs/core`, ver `SEGURIDAD.md` §3.4) |
| 1B Endurecer la API | S-01, S-04, S-05, S-06, S-07 | **Hecho** (2026-09-27). Diferencias con el plan: login con 20/min por IP y 5/min por email (sin el límite por hora); la invitación limita por IP y por email invitado, no por coach, porque el límite se aplica antes de identificar al usuario. `execution` y `tracking` mantienen su propio chequeo de relación. |
| 1C Google sin tokens en la URL | S-02 | Pendiente |
| 1D Cabeceras en Vercel | S-07 | Pendiente (con el paso 4 del deploy) |
| 1E Alertas de seguridad a Slack | Detección | Pendiente |
| 2A Refresh en cookie | S-08 | Pendiente |
| 2B Keychain en móvil | S-09 | Pendiente (rama móvil) |
| 2C Tests y CI | S-11 | Pendiente |
| 3A Tiempos del login | S-10 | Pendiente |
| 3B Append-only en la base | S-12 | Pendiente |
