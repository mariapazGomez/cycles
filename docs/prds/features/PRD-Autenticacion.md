---
type: prd
level: feature
parent: "[[PRD-General]]"
status: complete
phase: "Fase 1 — Auth & onboarding"
created: 2026-09-16
updated: 2026-11-01
tags: [prd, feature/auth]
related: []
---

# PRD — Autenticación

> Hijo de [[PRD-General]]. Fase: Fase 1 — Auth & onboarding.

## 1. Resumen

Permite a coaches y atletas registrarse e iniciar sesión mediante email/contraseña o Google, con verificación de email y vinculación automática de cuentas por email. El registro ofrece las dos opciones, coach y atleta (ver [[PRD-General]], sección 4, y CYC-187): un atleta que se registra solo queda sin coach hasta aceptar una invitación enviada a su correo. Apple queda fuera del MVP (ver sección 3).

## 2. Problema / motivación

Sin autenticación no hay identidad de usuario, por lo que ninguna otra funcionalidad (ciclos, atletas, progreso) puede implementarse. Cubre las historias 1 y 8 del [[PRD-General]]: login con múltiples proveedores y recuperación de contraseña.

## 3. Alcance

### Dentro de alcance

- Registro manual con email + contraseña — **solo rol `coach`** (`POST /auth/register` rechaza `role: athlete` con 403; ver [[PRD-General]], sección 4).
- Login manual, bloqueado hasta que el email esté verificado.
- Verificación de email obligatoria (link enviado al registrarse).
- Login/registro con Google OAuth 2.0 — también crea cuentas sin rol asignado (`role: null`) hasta completar onboarding; la persona elige coach o atleta en «Un último paso».
- `POST /auth/complete-profile`: asigna el rol tras un login por Google (solo acepta `coach`; solo se puede ejecutar una vez).
- **Vinculación automática de cuentas por email:** si un usuario ya registrado manualmente inicia sesión con Google usando el mismo email, se asocia al mismo `User` en vez de crear una cuenta duplicada (y de paso se marca el email como verificado, ya que Google lo garantiza).
- Emisión, refresh (rotativo, con detección de reuso) y revocación (`logout`) de JWT.
- Recuperación de contraseña (flujo manual únicamente; no aplica a cuentas que solo usan Google).
- Consentimiento de datos (`dataConsentAt`) capturado como checkbox opcional en el registro/onboarding (ver [[VISION]]); obligatorio solo cuando se implemente la creación de cuentas de atleta vía invitación.

### Fuera de alcance

- Sign in with Apple: se documenta como pendiente, se agrega si se publica una app nativa en App Store (donde Apple lo exige) o antes si hay demanda.
- Autenticación multifactor (MFA).
- Login con otros proveedores (Facebook, Microsoft, etc.).
- Cambio de rol post-registro (fuera de este PRD; lo gestionaría `admin` en una funcionalidad aparte).

## 4. Historias de usuario

1. Como **coach nuevo**, quiero registrarme con email y contraseña, para crear mi cuenta.
2. Como **usuario registrado manualmente**, quiero confirmar mi email mediante un link, para poder iniciar sesión.
3. Como **usuario**, quiero iniciar sesión con Google, para no tener que crear ni recordar una contraseña.
4. Como **usuario que ya tenía cuenta manual**, quiero que si inicio sesión con Google usando el mismo email se reconozca como mi misma cuenta, para no terminar con cuentas duplicadas.
5. Como **usuario registrado manualmente**, quiero solicitar un enlace de recuperación de contraseña por email, para recuperar el acceso si la olvido.
6. Como **atleta**, quiero dar mi consentimiento explícito sobre el uso de mis datos al registrarme, para entender cómo se usará mi información.
7. Como **usuario autenticado**, quiero que mi sesión se mantenga activa sin volver a loguearme constantemente, pero que expire si el token no se refresca, para balancear comodidad y seguridad.

## 5. Modelo de datos (delta)

Usa directamente `User` (`passwordHash`, `authProvider`, `role` ahora nullable, `emailVerifiedAt`, `dataConsentAt`, `dataConsentVersion`) definido en `apps/api/prisma/schema.prisma`. Se añaden tres tablas no cubiertas en el modelo general, ya implementadas:

- `PasswordResetToken`: `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt?`.
- `EmailVerificationToken`: `id`, `userId`, `tokenHash`, `expiresAt`.
- `RefreshToken`: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt?` — persistido para poder rotar y revocar sesiones (no solo confiar en la expiración del JWT).

## 6. Diseño de API (delta) — implementado en `apps/api/src/auth`

- `POST /auth/register` — registro manual (email, password, name, role, consentimiento opcional). Rechaza `role: athlete` con 403.
- `POST /auth/verify-email` — confirma el email con el token recibido.
- `POST /auth/verify-email/resend` — reenvía el link de verificación (respuesta genérica, no revela si el email existe).
- `POST /auth/login` — login manual (bloqueado si el email no está verificado), devuelve access + refresh token.
- `POST /auth/refresh` — rota el refresh token (revoca el anterior, emite un par nuevo); si detecta reuso de un token ya rotado, revoca todas las sesiones del usuario.
- `POST /auth/logout` — revoca el refresh token recibido.
- `POST /auth/complete-profile` (protegido) — asigna `role: coach` a una cuenta creada vía Google sin rol; falla si ya tiene rol asignado.
- `GET /auth/google` / `GET /auth/google/callback` — flujo OAuth Google; si el email ya existe (cuenta manual), se vincula en vez de crear un usuario nuevo; si no existe, crea la cuenta con `role: null` pendiente de `complete-profile`. El callback **no** pone tokens en la URL: redirige a `/oauth-callback?code=…` con un código de un solo uso que vence en 60 segundos (se guarda solo su hash, tabla `OAuthExchangeCode`).
- `POST /auth/google/exchange` (público, con límite de intentos) — recibe `{ code }` y devuelve el par de tokens. Código inválido, usado o vencido: 401. Ver [[SEGURIDAD]], hallazgo S-02.
- `POST /auth/password-reset/request` — solicita email de recuperación (respuesta genérica).
- `POST /auth/password-reset/confirm` — establece nueva contraseña con el token recibido y revoca todas las sesiones activas del usuario.

> **Sesión de la web con cookie (CYC-89, 2026-11-01).** Si el pedido trae `X-Cycles-Client: web`, `login`, `google/exchange` y `athletes/invitations/accept` entregan el refresh token en la cookie `httpOnly` `cycles_rt` (`SameSite=Strict`, `Path=/auth`, `Secure` en producción) y devuelven solo el `accessToken` en el cuerpo; `refresh` y `logout` leen la cookie (con `Origin` permitido, por CSRF) o el cuerpo (app móvil). El access token de la web vive solo en memoria y se obtiene con `/auth/refresh` al cargar la página. Ver [[SEGURIDAD]], S-08.

> Endpoints de Apple (`GET /auth/apple`, callback) quedan fuera del MVP — ver sección 3. El módulo `auth` solo registra la estrategia de Google si `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` están configurados en el entorno; si no, esas dos rutas responden con error al invocarse pero el resto de la API funciona con normalidad.

## 7. UI/UX

- Pantalla de login con dos opciones visibles: "Continuar con Google" y formulario de email/contraseña.
- Pantalla de registro: mismos dos métodos, sin selector de rol (el registro público solo crea cuentas `coach`; `POST /auth/register` rechaza `athlete` con 403) + checkbox de consentimiento de datos, opcional (ver [[PRD-General]], sección 3). En Google, el consentimiento se pregunta en un paso posterior de onboarding (`/auth/complete-profile`), que tampoco pide rol porque solo acepta `coach`.
- Pantalla de "revisa tu email" tras registro manual, y de confirmación tras hacer clic en el link de verificación.
- Pantalla "Olvidé mi contraseña" y pantalla de definir nueva contraseña (accedida vía link del email).

## 8. Requisitos no funcionales específicos

- Rate limiting estricto en `/auth/login`, `/auth/register` y `/auth/password-reset/*` (mitigar fuerza bruta y enumeración de usuarios).
- Los mensajes de error de login no deben revelar si el email existe o no ("credenciales inválidas" genérico).
- Tokens de recuperación de contraseña: un solo uso, expiración corta (p. ej. 30 min), almacenados hasheados (no en texto plano).

## 9. Dependencias

- Depende de: nada (es la funcionalidad base de la Fase 1).
- Relacionado con: la futura funcionalidad de invitación coach→atleta (historia 2 del PRD general), que reutilizará el flujo de registro.

## 10. Métricas de éxito

- Tasa de éxito de login (intentos exitosos / totales).
- % de registros por proveedor (manual vs Google vs Apple), para priorizar mantenimiento.
- Tiempo promedio de registro a primer login exitoso.

## 11. Estado y decisiones abiertas

- **Proveedor de email transaccional: resuelto — Resend** (ver decisiones del [[PRD-General]], sección 11, 2026-09-19). **Implementado**: `apps/api/src/mail/mail.service.ts` envía por Resend desde `hola@mail.getcycles.app`; sin `RESEND_API_KEY` queda en modo desarrollo (solo en local; en producción la API no arranca sin la clave).
- **Tokens de Google fuera de la URL: resuelto** (2026-09-27, PR 1C de `docs/PLAN-Seguridad.md`) con el código de un solo uso descrito en la sección de endpoints.
- Apple Sign In postergado deliberadamente (ver sección 3); se reevalúa si se publica app nativa en App Store o si hay demanda explícita.
- Texto legal exacto del consentimiento de datos (`dataConsentVersion`): la política y los términos están publicados y su aceptación se guarda versionada para coach y atleta (`PolicyAcceptance`, ver [[PRD-PrivacidadYTerminos]] §7); falta la revisión legal por una persona abogada.
