---
type: reference
tags: [reference, dev]
updated: 2026-09-25
---

> Acceso rápido a todo lo que vamos generando: pantallas del frontend, API, y artifacts publicados. Se actualiza a mano cada vez que agregamos algo nuevo.

# Enlaces

## Frontend (`localhost:5173`, con `npm run dev` en `apps/web`)

| Ruta | Qué es | Quién la ve |
|---|---|---|
| `/login` | Iniciar sesión (email/contraseña o Google) | Pública |
| `/register` | Registro de coach | Pública |
| `/forgot-password` | Solicitar link de recuperación de contraseña | Pública |
| `/check-email` | "Revisa tu email" post-registro + reenviar verificación | Pública |
| `/verify-email?token=...` | Confirma el email a partir del link enviado | Pública |
| `/reset-password?token=...` | Define nueva contraseña a partir del link enviado | Pública |
| `/accept-invitation?token=...` | Atleta activa su cuenta a partir de la invitación del coach | Pública |
| `/oauth-callback` | Callback interno del login con Google (no se visita a mano) | — |
| `/complete-profile` | Último paso de onboarding para cuentas creadas por Google sin rol | Autenticado, sin rol |
| `/` | Inicio. Coach: "Necesitan atención" (avisos por atleta con ajuste de carga). Atleta: su próxima sesión, empezarla u omitirla | Autenticado |
| `/athletes/:athleteId` | Resumen del atleta: avisos, carga semanal, adherencia, fuerza estimada por ejercicio | Autenticado (coach, relación activa) |
| `/routines` | Biblioteca de rutinas, con reps en reserva objetivo por ejercicio | Autenticado (coach) |
| `/sessions/:id/registro` | Registro de una sesión por serie + cierre (esfuerzo, duración, dolor), pensado para el celular | Autenticado (atleta asignado) |
| `/athletes` | Invitar atletas + lista con su estado | Autenticado (coach) |
| `/cycles` | Planes: lista de ciclos + crear uno nuevo | Autenticado (coach) |
| `/cycles/:id` | Detalle de un plan: grid con el progreso real por celda y los avisos del plan | Autenticado (coach dueño o atleta asignado) |
| `/sessions/:id` | Detalle de una sesión: editar, agregar/quitar ejercicios del catálogo | Autenticado (coach dueño o atleta asignado) |

> Nota: el link de verificación de email / reset de contraseña / invitación no llega a ningún inbox real todavía (Resend sin implementar) — aparece logueado en `/private/tmp/cycles-api.log` cuando se genera.

## Backend / API (`localhost:3000`, con `npm run dev:api`)

Sin Swagger/OpenAPI activado todavía (pendiente, ver `docs/prds/PRD-General.md`). El detalle de cada endpoint vive en el PRD de su funcionalidad:

| Recurso | Endpoints | Documentado en |
|---|---|---|
| Auth | `/auth/*` | [[PRD-Autenticacion]] |
| Atletas / invitaciones | `/athletes*` | [[PRD-InvitacionAtletas]] |
| Ejercicios (catálogo) | `/exercises*` | [[PRD-CatalogoEjercicios]] |
| Ciclos | `/cycles*` | [[PRD-CRUDCiclos]] |
| Sesiones / ejercicios de sesión (celdas del grid) | `/cycles/:id/sessions`, `/sessions*`, `/session-exercises/:id` | [[PRD-RutinasYProgramacion]] |
| Rutinas (biblioteca del coach) | `/routines*` | [[PRD-RutinasYProgramacion]] |
| Hijos de un macrociclo | `/cycles/:id/children` | [[PRD-RutinasYProgramacion]] |
| Registro del atleta | `/me/today`, `/sessions/:id/start`, `/session-exercises/:id/logs`, `/sessions/:id/feedback` | [[PRD-EjecucionYSeguimiento]] |
| Seguimiento del coach | `/coach/attention`, `/athletes/:id/summary`, `/cycles/:id/progress`, `/cycles/:id/load-adjustments` | [[PRD-EjecucionYSeguimiento]] |

## Base de datos

- Postgres local, base `cycles_dev` (`apps/api/.env` → `DATABASE_URL`).
- Explorar visualmente: `npx prisma studio` desde `apps/api` (abre en el navegador, puerto que asigne Prisma).
- Consola: `psql cycles_dev`.

## Artifacts publicados (claude.ai)

| Qué es | Link |
|---|---|
| Diagrama del modelo relacional (interactivo) | https://claude.ai/artifact/Wdfz4Rcq2tXaibdpbTYXzK |

> La versión "de registro" del mismo diagrama vive versionada en `docs/prds/PRD-General.md` (sección 6) y como archivo standalone en `docs/diagrams/modelo-relacional.html`.

## Documentación del proyecto

| Qué es | Path |
|---|---|
| PRD padre del producto | `docs/prds/PRD-General.md` |
| Visión de compañía | `docs/prds/VISION.md` |
| Arquitectura técnica | `docs/ARCHITECTURE.md` |
| Estrategia de marca | `docs/brand/brand.md` |
| Identidad visual (decisiones de color/tipografía) | `docs/brand/identidad-visual.md` |
| Investigación competitiva | `docs/brand/investigacion-competitiva.md` |
| Índice de PRDs hijos por funcionalidad | `docs/prds/PRD-General.md` (sección 0) |

## Usuarios de prueba

| Rol | Email | Password |
|---|---|---|
| Coach | `coach.test@example.com` | `newpassword456` |
| Atleta | `atleta.test@example.com` | `athletepass123` |
