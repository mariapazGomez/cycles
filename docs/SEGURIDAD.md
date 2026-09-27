---
type: reference
tags: [seguridad, reglas]
status: vigente
created: 2026-09-26
updated: 2026-09-26
---

# Seguridad de Cycles

> Documento de referencia sobre la seguridad del proyecto. Tiene tres partes:
> 1. **Archivos sensibles**: dónde vive cada pieza que protege a la app o a los datos.
> 2. **Reglas**: las convenciones que ya seguimos y que todo cambio debe respetar. Son las mismas que resume [[PRD-General]] §8.1.
> 3. **Auditoría**: qué se revisó, qué está bien y qué falta corregir, con prioridad.
>
> Se actualiza cuando cambia algo de lo de abajo: un archivo sensible nuevo, una regla nueva o un hallazgo resuelto. La auditoría se hizo sobre `main` + rama `feat/email-resend` al 2026-09-26.

---

## 1. Archivos sensibles

### Secretos y configuración

| Archivo | Qué contiene | Regla |
|---|---|---|
| `apps/api/.env` | Secretos locales: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, credenciales de Google, `RESEND_API_KEY` | Nunca se commitea (está en `.gitignore`). Solo desarrollo. |
| `apps/api/.env.example` | Los nombres de las variables, sin valores reales | Se actualiza cada vez que se agrega una variable. Nunca lleva un secreto. |
| `apps/web/.env` / `.env.example` | `VITE_API_URL` | Todo `VITE_*` termina **dentro del JavaScript público**: nunca poner un secreto ahí. |
| `.gitignore` | Excluye `.env`, `.env.local`, `node_modules`, `dist` | No quitar esas entradas. |
| Variables de Render y Vercel (producción) | Los mismos secretos que `.env`, con valores distintos | Solo en el panel de cada servicio y en el gestor de contraseñas. Ver `docs/deploy/PLAN-Deploy.md`. |

### Autenticación y permisos

| Archivo | Qué hace |
|---|---|
| `apps/api/src/auth/auth.service.ts` | Registro, login, refresh con rotación, verificación de email, recuperación de contraseña, login con Google. Aquí viven los TTL de los tokens. |
| `apps/api/src/auth/auth.controller.ts` | Endpoints públicos de `/auth/*` y el callback de Google. |
| `apps/api/src/auth/token.util.ts` | Genera tokens aleatorios y los hashea (SHA-256) antes de guardarlos. |
| `apps/api/src/auth/strategies/jwt.strategy.ts` | Valida el access token en cada request. |
| `apps/api/src/auth/strategies/google.strategy.ts` | OAuth con Google (scopes `email` y `profile`). |
| `apps/api/src/auth/dto/complete-profile.dto.ts` | Impide que alguien se asigne el rol `athlete` sin invitación. |
| `apps/api/src/common/guards/jwt-auth.guard.ts`, `roles.guard.ts`, `decorators/roles.decorator.ts` | Exigen sesión y rol por endpoint. |
| `apps/api/src/common/access.ts` | Chequeo compartido de relación coach–atleta activa (regla R5). |
| `apps/api/src/common/throttle/throttle.ts` | Límites de intentos por IP y por email, en un solo lugar para ajustarlos. |
| `apps/api/src/common/config/env.validation.ts` | Valida las variables al arrancar: la API no arranca si falta un secreto o si en producción falta el email real. |
| `apps/api/src/main.ts` | `helmet`, CORS restringido y `trust proxy`. |
| `apps/api/src/athletes/athletes.service.ts` | Invitaciones: el único camino para crear un atleta. |
| `apps/api/src/*/…service.ts` (`assertAccess`, `assertCycleAccess`, `getForCoach`, `getWritableSession`, `assertActiveRelation`) | Chequeos de **propiedad**: el rol solo no alcanza; cada servicio verifica que el dato sea del usuario. |

### Datos

| Archivo | Qué hace |
|---|---|
| `apps/api/prisma/schema.prisma` | Modelo de datos completo. Tablas sensibles: `User` (hash de contraseña, consentimiento), `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`, `AthleteInvitationToken`, `ExerciseLog` y `SessionFeedback` (datos de salud y rendimiento). |
| `apps/api/prisma/migrations/` | Historial de cambios de esquema. Nunca se edita una migración ya aplicada. |
| `apps/api/src/execution/`, `apps/api/src/tracking/` | Registro de ejecución (append-only) y lectura del seguimiento del coach. |

### Clientes

| Archivo | Qué hace |
|---|---|
| `apps/web/src/services/tokenStore.ts` | Guarda los tokens en `localStorage` (ver hallazgo S-08). |
| `apps/web/src/services/httpClient.ts` | Adjunta el token y refresca la sesión ante un 401. |
| `apps/web/src/pages/OAuthCallbackPage.tsx` | Recibe un código de un solo uso de Google por la URL y lo cambia por los tokens con un `POST` (hallazgo S-02, resuelto). |
| `apps/mobile/src/services/tokenStore.ts` *(rama `worktree-mobile-app`, sin mergear)* | Guarda los tokens del celular en `AsyncStorage` (ver hallazgo S-09). |

### Email

| Archivo | Qué hace |
|---|---|
| `apps/api/src/mail/mail.service.ts` | Envío por Resend. Sin `RESEND_API_KEY` escribe los enlaces en el log (solo para desarrollo, ver S-06). |
| `apps/api/src/mail/templates.ts` | Plantillas; escapa el nombre del coach antes de insertarlo en el HTML. |

---

## 2. Reglas de seguridad del proyecto

Son obligatorias para todo cambio: código, infraestructura y documentación. Si un cambio necesita romper una regla, primero se discute y se actualiza este documento.

### R1 · Secretos
1. Ningún secreto en el repositorio, en issues, en PRs ni en conversaciones. Solo en `.env` locales (ignorados por git), en los paneles de Render y Vercel y en el gestor de contraseñas.
2. Secretos **distintos por entorno** (desarrollo ≠ producción) y **distintos entre sí** (`JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`), de al menos 64 caracteres aleatorios.
3. Las API keys se crean con el mínimo permiso posible (p. ej. Resend: solo envío, restringida al dominio).
4. Nada secreto en variables `VITE_*`: son públicas.

### R2 · Autenticación
1. Contraseñas con **bcrypt, costo 12**; mínimo 8 caracteres.
2. Access token de **15 minutos**. Refresh token de **30 días**, **rotativo** y guardado **hasheado**. Si alguien reusa un refresh token ya rotado, se revocan todas las sesiones del usuario.
3. Los tokens de un solo uso (verificación de email, recuperación de contraseña, invitación) son **32 bytes aleatorios**, se guardan **solo como hash SHA-256** y vencen: 24 horas, 30 minutos y 7 días respectivamente.
4. Cambiar la contraseña revoca todas las sesiones abiertas.
5. El login manual exige **email verificado**.

### R3 · No revelar si una cuenta existe
En los flujos públicos de **recuperación de contraseña** y **reenvío de verificación**, la respuesta es siempre la misma, exista o no el email, y aunque falle el envío.

*Excepción aceptada:* el registro y la invitación responden "Ya existe una cuenta con este email", porque el usuario necesita saberlo para seguir.

### R4 · Roles
1. Un usuario es **coach o atleta**, nunca ambos.
2. Un atleta **solo** se crea por invitación de un coach. Ningún endpoint deja elegirse el rol `athlete`.
3. Cada endpoint declara su rol con `@Roles(...)` + `RolesGuard` cuando corresponde.

### R5 · Propiedad de los datos
1. El rol no alcanza: cada servicio verifica que el dato pedido sea del usuario (coach dueño del plan, atleta asignado, rutina propia).
2. Un coach solo accede a los datos de un atleta mientras la relación está **activa**. El atleta conserva siempre el acceso a lo suyo.
3. Un ejercicio del catálogo propio de un coach no es visible para otros coaches.
4. Solo el atleta asignado registra su ejecución, y solo sobre un plan activo.

### R6 · Validación de entrada
1. Todo endpoint recibe un DTO con `class-validator`. El `ValidationPipe` global descarta los campos no declarados (`whitelist`).
2. Los ids que genera el cliente se validan como UUID.
3. Cualquier texto de un usuario que se inserte en HTML (emails) se escapa.

### R7 · Integridad y privacidad de los datos
1. `ExerciseLog` y `SessionFeedback` son **append-only**: no hay endpoints que los editen o borren; una corrección es una fila nueva con `supersedesId`.
2. Los timestamps se guardan en UTC.
3. Ningún dato de un atleta se usa en análisis entre atletas sin `dataConsentAt` (ver [[VISION]]).
4. Pesos en kg; la conversión es solo de presentación.

### R8 · Logs
1. En producción nunca se loguean contraseñas, tokens, enlaces con token ni el cuerpo completo de un request de auth.
2. Los errores al usuario son una frase clara, sin stack ni detalles internos.

### R9 · Fallas de servicios externos
Si un servicio externo falla (p. ej. el email), la app no revela información (R3) ni deja datos a medias. Ejemplo: una invitación que no se pudo enviar deshace lo que creó.

### R10 · Frontend
1. Nada de `dangerouslySetInnerHTML` ni de construir HTML con texto del usuario.
2. Los enlaces a sitios externos usan `rel="noopener noreferrer"`.

### R11 · Dependencias
1. Revisar `npm audit --omit=dev` antes de cada deploy. No desplegar con vulnerabilidades **altas o críticas en paquetes que corren en producción** sin una razón escrita.
2. Versiones fijadas por `package-lock.json`, que se commitea.

### R12 · Proceso
1. Todo cambio entra a `main` por PR.
2. Los cambios que tocan R2, R4 o R5 describen en el PR qué se probó para los casos prohibidos (otro rol, otro dueño, relación inactiva).

---

## 3. Auditoría (2026-09-26)

### 3.1 Qué se revisó

Autenticación y sesiones, OAuth con Google, permisos de cada controlador y servicio de la API, validación de entrada, manejo de secretos y `.gitignore`, historial de git, logs, envío de email, almacenamiento de tokens en web y móvil, riesgos de XSS e inyección SQL, y dependencias de producción (`npm audit --omit=dev`).

### 3.2 Lo que está bien

- **Contraseñas y tokens:** bcrypt con costo 12. Refresh tokens rotativos y hasheados, con detección de reuso que revoca todas las sesiones. Tokens de un solo uso aleatorios, hasheados y con vencimiento. Cambiar la contraseña revoca las sesiones.
- **Sin enumeración** en recuperación de contraseña ni en reenvío de verificación.
- **Roles:** los atletas solo se crean por invitación, y `complete-profile` solo acepta `coach`.
- **Propiedad:** cada servicio verifica la propiedad del dato. Los módulos de ejecución y seguimiento además exigen la relación activa.
- **Validación:** `ValidationPipe` global con `whitelist`, y DTOs en todos los endpoints revisados.
- **Consultas:** no hay SQL crudo (`$queryRaw`/`$executeRaw`); todo va por Prisma con consultas parametrizadas.
- **XSS:** no hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval` en la web.
- **Secretos locales:** `.env` nunca se commiteó. Los secretos JWT tienen 64 caracteres y son distintos entre sí.
- **Datos personales:** `/users/me` no expone el hash de la contraseña.
- **Email:** si falla el envío, la invitación deshace lo creado, y los enlaces con token no se loguean cuando hay key.

### 3.3 Hallazgos

Severidad: **Alta** = resolver antes de abrir el piloto; **Media** = antes de sumar más usuarios; **Baja** = mejora planificada.

| ID | Severidad | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|
| S-01 | ~~Alta~~ **Resuelto** (2026-09-27, PR 1B) | **Sin límite de intentos** en login, registro, recuperación de contraseña, reenvío de verificación ni invitación. El PRD general lo exige. Con emails reales, además, cualquiera puede usar los endpoints de reenvío y recuperación para mandar emails a terceros y agotar la cuota de Resend. | No hay `@nestjs/throttler` ni equivalente en `apps/api`. | Agregar `@nestjs/throttler`: límite general bajo, y más estricto por IP y por email en `/auth/login`, `/auth/register`, `/auth/verify-email/resend`, `/auth/password-reset/request` y `/athletes/invite`. |
| S-02 | ~~Alta~~ **Resuelto** (2026-09-27, PR 1C; falta probarlo con Google real, ver P-09) | **Los tokens de Google viajan en la URL** del redirect al frontend: quedan en el historial del navegador y en logs de proxies, y pueden filtrarse por el encabezado `Referer`. El propio código lo marca como pendiente antes de producción. | `apps/api/src/auth/auth.controller.ts:107-108` | Redirigir con un **código de un solo uso** (aleatorio, hasheado, que vence en ~60 s) y que el frontend lo cambie por los tokens con un `POST`. |
| S-03 | ~~Alta~~ **Resuelto** (2026-09-27, PR 1A; queda 1 excepción moderada, ver §3.4) | **Dependencias con vulnerabilidades conocidas:** 16 en producción (1 crítica, 6 altas). Las que corren en el servidor: `@nestjs/platform-express` / `body-parser` (DoS), `multer`, `lodash`, `js-yaml`, `qs`. En la web: `react-router` (redirección abierta). La crítica (`tar`) llega por `bcrypt` y solo se usa al compilar, no en ejecución. | `npm audit --omit=dev` | Actualizar NestJS a su último parche 10.x, `react-router-dom` y `bcrypt` (o pasar a `bcryptjs`). Volver a correr la auditoría y dejar anotado lo que quede. |
| S-04 | ~~Media~~ **Resuelto** (2026-09-27, PR 1B) | **CORS abierto a cualquier origen.** Hoy los tokens van en un header y no en cookies, así que no hay riesgo de CSRF, pero cualquier sitio puede llamar a la API desde el navegador. | `apps/api/src/main.ts:9` | Restringir `enableCors` a `FRONTEND_URL` (y al origen de la app móvil si lo necesita). Ya está en el paso 3 del plan de deploy. |
| S-05 | ~~Media~~ **Resuelto** (2026-09-27, PR 1B) | **Un coach conserva acceso a los planes y sesiones de un atleta cuya relación dejó de estar activa.** Contradice [[PRD-General]] §4 y la regla R5.2. Ejecución y seguimiento sí lo chequean; `cycles` y `sessions` no. | `apps/api/src/cycles/cycles.service.ts:114`, `apps/api/src/sessions/sessions.service.ts:210` | Sumar el chequeo de relación activa para el coach en `assertAccess` y `assertCycleAccess`. El atleta mantiene su acceso. |
| S-06 | ~~Media~~ **Resuelto** (2026-09-27, PR 1B) | **Sin validación de variables de entorno al arrancar.** Si en producción falta `RESEND_API_KEY`, el `MailService` entra en modo desarrollo y **escribe en el log los enlaces con token** (verificación, recuperación, invitación). También arranca sin avisar si falta `FRONTEND_URL`. | `apps/api/src/mail/mail.service.ts:52`; `ConfigModule.forRoot` sin validación | Validar las variables al iniciar y, con `NODE_ENV=production`, exigir `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL`, los secretos JWT y `DATABASE_URL`. Si falta alguna, que la API no arranque. |
| S-07 | Media · **API resuelta** (2026-09-27, PR 1B: `helmet`); falta la web (1D, con el paso 4 del deploy) | **Sin cabeceras de seguridad HTTP** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`). | `main.ts` sin `helmet`; sin `vercel.json` | `helmet` en la API. En Vercel, cabeceras con una CSP que solo permita el propio origen, la API y Google Fonts, y `Referrer-Policy: no-referrer`. |
| S-08 | Media | **Tokens en `localStorage` en la web:** si algún día entra un XSS, puede leerlos. Hoy está mitigado (React escapa el contenido y no hay `innerHTML`). | `apps/web/src/services/tokenStore.ts:11-15` | Aceptado para el piloto, junto con la CSP de S-07. Más adelante, mover el refresh token a una cookie `httpOnly`, `Secure` y `SameSite`. |
| S-09 | Media | **App móvil** *(rama sin mergear)*: guarda los tokens en `AsyncStorage`, que no está cifrado. | `apps/mobile/src/services/tokenStore.ts` | Antes de publicarla, usar el Keychain de iOS (p. ej. `react-native-keychain`). |
| S-10 | Baja | **Enumeración de cuentas:** el registro y la invitación dicen si el email existe (excepción aceptada en R3), y el login tarda menos cuando el email no existe porque no calcula bcrypt. | `auth.service.ts:48, 70`; `athletes.service.ts:25` | Opcional: comparar contra un hash ficticio cuando el usuario no existe, para igualar los tiempos. |
| S-11 | Baja | **Sin tests automáticos ni CI:** las reglas R4 y R5 se verificaron a mano en cada fase, así que un cambio futuro podría romperlas sin que nadie lo note. | No hay tests ni `.github/workflows` | Tests de autorización (otro rol, otro dueño, relación inactiva) y un CI mínimo con typecheck, build y `npm audit`. |
| S-12 | Baja | **Append-only solo en la aplicación:** la base de datos no impide un `UPDATE` o `DELETE` directo sobre `ExerciseLog` o `SessionFeedback`. | `schema.prisma` | Aceptado por ahora. Más adelante, un permiso de base de datos o un trigger que lo impida. |

### 3.4 Excepciones aceptadas

| Paquete | Severidad | Por qué se acepta | Cuándo se revisa |
|---|---|---|---|
| `@nestjs/core` ≤ 11.1.17 ([GHSA-36xv-jgw5-4q75](https://github.com/advisories/GHSA-36xv-jgw5-4q75)) | Moderada | Solo se corrige migrando NestJS 10 → 11.1.18 o superior, una migración mayor (Express 5, cambios de rutas). Las demás vulnerabilidades de NestJS se cerraron forzando versiones corregidas de `multer`, `body-parser`, `qs`, `lodash` y `file-type`. | Al migrar NestJS, tarea propia después del piloto (`docs/PLAN-Seguridad.md`, 1A paso 5). |

### 3.5 Resumen para el deploy

El plan para corregir cada hallazgo, con orden, archivos y pruebas, está en [`docs/PLAN-Seguridad.md`](PLAN-Seguridad.md).


Antes de abrir el piloto (paso 7 de `docs/deploy/PLAN-Deploy.md`) deberían estar resueltos **S-01, S-02 y S-03**. S-04 ya está previsto en el paso 3 del plan. S-05, S-06 y S-07 conviene hacerlos en la misma tanda porque son chicos.
