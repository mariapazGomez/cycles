---
type: prd
level: feature
parent: "[[PRD-General]]"
status: draft
phase: "Fase 1 — Auth & onboarding"
created: 2026-09-16
updated: 2026-09-16
tags: [prd, feature/auth]
related: []
---

# PRD — Autenticación

> Hijo de [[PRD-General]]. Fase: Fase 1 — Auth & onboarding.

## 1. Resumen

Permite a coaches y atletas registrarse e iniciar sesión mediante email/contraseña, Google o Apple, y acceder a la plataforma con un rol asociado.

## 2. Problema / motivación

Sin autenticación no hay identidad de usuario, por lo que ninguna otra funcionalidad (ciclos, atletas, progreso) puede implementarse. Cubre las historias 1 y 8 del [[PRD-General]]: login con múltiples proveedores y recuperación de contraseña.

## 3. Alcance

### Dentro de alcance

- Registro manual con email + contraseña.
- Login manual.
- Login/registro con Google OAuth 2.0.
- Login/registro con Apple (Sign in with Apple).
- Emisión y refresh de JWT.
- Recuperación de contraseña (flujo manual únicamente; no aplica a cuentas OAuth).
- Asignación de rol (`coach` | `athlete`) en el registro.

### Fuera de alcance

- Verificación de email obligatoria antes de usar la app (se documenta como mejora futura).
- Autenticación multifactor (MFA).
- Login con otros proveedores (Facebook, Microsoft, etc.).
- Cambio de rol post-registro (fuera de este PRD; lo gestionaría `admin` en una funcionalidad aparte).

## 4. Historias de usuario

1. Como **usuario nuevo**, quiero registrarme con email y contraseña indicando si soy coach o atleta, para crear mi cuenta.
2. Como **usuario**, quiero iniciar sesión con Google, para no tener que crear ni recordar una contraseña.
3. Como **usuario**, quiero iniciar sesión con Apple, para usar mi cuenta de Apple existente.
4. Como **usuario registrado manualmente**, quiero solicitar un enlace de recuperación de contraseña por email, para recuperar el acceso si la olvido.
5. Como **usuario autenticado**, quiero que mi sesión se mantenga activa sin volver a loguearme constantemente, pero que expire si el token no se refresca, para balancear comodidad y seguridad.

## 5. Modelo de datos (delta)

Sin tablas nuevas respecto al PRD general: usa directamente `User` (`passwordHash`, `authProvider`, `role`) definido en `apps/api/prisma/schema.prisma`. Se añade una tabla no cubierta en el modelo general:

- `PasswordResetToken`: `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt?`. (Pendiente de agregar al `schema.prisma` cuando se implemente esta fase.)

## 6. Diseño de API (delta)

- `POST /auth/register` — registro manual (email, password, name, role).
- `POST /auth/login` — login manual, devuelve access + refresh token.
- `POST /auth/refresh` — intercambia refresh token por nuevo access token.
- `GET /auth/google` / `GET /auth/google/callback` — flujo OAuth Google.
- `GET /auth/apple` / `POST /auth/apple/callback` — flujo OAuth Apple (callback vía POST según spec de Apple).
- `POST /auth/password-reset/request` — solicita email de recuperación.
- `POST /auth/password-reset/confirm` — establece nueva contraseña con el token recibido.

## 7. UI/UX

- Pantalla de login con tres opciones visibles: "Continuar con Google", "Continuar con Apple", formulario de email/contraseña.
- Pantalla de registro: mismos tres métodos + selector de rol (coach/atleta) solo visible en el flujo manual (en OAuth se pregunta el rol en un paso posterior de onboarding, ya que Google/Apple no lo proveen).
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

- Pendiente decidir proveedor de email transaccional para el flujo de recuperación de contraseña (ver decisiones abiertas del [[PRD-General]]).
- Pendiente confirmar si Apple Sign In es obligatorio desde el MVP o se puede postergar (Apple lo exige solo si se publica en App Store; para web puro no es obligatorio).
