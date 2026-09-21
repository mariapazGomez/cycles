---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 2 — Planificación"
created: 2026-09-20
updated: 2026-09-20
tags: [prd, feature/invitacion-atletas]
related: ["[[PRD-Autenticacion]]"]
---

# PRD — Invitación de atletas

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.

## 1. Resumen

Permite a un coach invitar a un atleta por email para vincularlo a su cuenta. El atleta completa su cuenta (nombre ya cargado por el coach + contraseña) a partir del link de invitación, sin poder auto-registrarse eligiendo el rol `athlete` por fuera de este flujo (ver [[PRD-General]], sección 4).

## 2. Problema / motivación

Sin relación coach-atleta no hay a quién asignarle ciclos de entrenamiento (Fase 2 depende de esto). Cubre la historia 2 del [[PRD-General]].

## 3. Alcance

### Dentro de alcance

- `POST /athletes/invite` (coach): crea la cuenta del atleta en estado incompleto (`role: athlete`, sin contraseña) + una relación `CoachAthlete` en `status: pending` + un token de invitación de un solo uso.
- `POST /athletes/invitations/accept` (público): el atleta define su contraseña con el token recibido; al aceptar, la cuenta queda verificada, la relación pasa a `status: active`, y se le devuelven tokens de sesión (queda logueado).
- `GET /athletes` (coach): lista los atletas del coach autenticado (todas las relaciones, con su `status`).
- Si el email invitado ya pertenece a **cualquier** cuenta existente (coach, atleta con o sin relación activa, admin), la invitación se rechaza con un mensaje claro. No hay lógica de "vincular si no tiene coach activo" en esta iteración — decisión tomada el 2026-09-20 para no acoplar esta pieza con un flujo de reasignación de coach que no existe todavía.
- Envío del email de invitación reutiliza el `MailService` de desarrollo (loguea el link) — mismo approach que verificación de email / reset de contraseña, hasta que se implemente Resend (ver [[PRD-General]], sección 11).

### Fuera de alcance

- Terminar la relación coach-atleta (marcarla `inactive`) — funcionalidad separada, no bloquea esta pieza.
- Aceptar la invitación vinculando una cuenta de Google — requiere pasar el token de invitación a través del `state` del flujo OAuth; se pospone junto con la configuración real de credenciales de Google (ver [[PRD-Autenticacion]]). Por ahora la aceptación es solo manual (contraseña).
- Reenviar el link de invitación si expira o se pierde (análogo a `verify-email/resend`) — se agrega si hay demanda.
- Editar el nombre del atleta después de la invitación, o que el atleta lo edite al aceptar.
- Un atleta con más de una invitación `pending` simultánea de distintos coaches: no se previene ni se resuelve explícitamente; ambas conviven hasta que una se acepta (la otra queda huérfana, sin impacto funcional porque no se puede aceptar dos veces con el mismo usuario ya con contraseña).

## 4. Historias de usuario

1. Como **coach**, quiero invitar a un atleta por email, para vincularlo a mi cuenta. (Historia 2 del PRD general)
2. Como **atleta invitado**, quiero definir mi contraseña a partir del link de invitación, para activar mi cuenta y empezar a usarla.
3. Como **coach**, quiero ver la lista de mis atletas y el estado de cada relación (`pending`/`active`), para saber quién ya aceptó.

## 5. Modelo de datos (delta)

Nueva tabla (los enums `UserRole` y `CoachAthleteStatus` ya existían desde el scaffold inicial — `pending` ya anticipaba este flujo):

```prisma
model AthleteInvitationToken {
  id             String    @id @default(uuid())
  coachAthleteId String    @unique
  tokenHash      String    @unique
  expiresAt      DateTime
  usedAt         DateTime?
  createdAt      DateTime  @default(now())

  coachAthlete CoachAthlete @relation(fields: [coachAthleteId], references: [id])
}
```

`coachAthleteId` es `@unique`: una sola invitación activa por relación (re-invitar borra la anterior, igual que `EmailVerificationToken`).

## 6. Diseño de API (delta) — implementado en `apps/api/src/athletes`

- `POST /athletes/invite` (protegido, rol `coach`) — body `{ email, name }`. 409 si el email ya existe como cualquier usuario.
- `POST /athletes/invitations/accept` (público) — body `{ token, password }`. Devuelve `AuthTokens` (login automático). 401 si el token es inválido/expiró/ya se usó.
- `GET /athletes` (protegido, rol `coach`) — devuelve las relaciones del coach autenticado con datos básicos del atleta (`id`, `name`, `email`, `status` de la relación).

## 7. UI/UX

- En la Home del coach (`apps/web`, hoy un placeholder): formulario simple "Invitar atleta" (nombre + email) y una lista de atletas invitados con su estado.
- Pantalla pública `/accept-invitation?token=...`: formulario de una sola contraseña (+ confirmación) para activar la cuenta; al enviar, loguea automáticamente y redirige a la home del atleta (que hoy también es el mismo placeholder genérico).

## 8. Requisitos no funcionales específicos

- El token de invitación se guarda hasheado (igual que los demás tokens de un solo uso) y expira (7 días — más largo que la verificación de email porque depende de que un tercero, no el propio usuario, actúe).
- `POST /athletes/invite` debe validar que quien invita tiene `role: coach` (vía `RolesGuard`, ya scaffoldeado sin usar hasta ahora).

## 9. Dependencias

- Depende de: [[PRD-Autenticacion]] (login, JWT, `RolesGuard`).
- Relacionado con: futuros PRDs de ciclos/sesiones, que van a requerir una relación `CoachAthlete` con `status: active` para poder asignar un `TrainingCycle`.

## 10. Métricas de éxito

- % de invitaciones enviadas que terminan aceptadas.
- Tiempo entre invitación enviada y aceptación.

## 11. Estado y decisiones abiertas

- Aceptación vía Google pospuesta (ver sección 3) — se retoma cuando se configuren credenciales reales de Google OAuth.
- Terminar relación coach-atleta: pendiente, funcionalidad separada.
- Reenvío de invitación expirada: pendiente, se agrega si hay demanda.
