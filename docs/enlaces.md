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
| `/oauth-callback?code=...` | Callback interno del login con Google: cambia el código de un solo uso por la sesión (no se visita a mano) | — |
| `/complete-profile` | Último paso de onboarding para cuentas creadas por Google sin rol | Autenticado, sin rol |
| `/` | Inicio. Coach: "Necesitan atención" (avisos por atleta con ajuste de carga). Atleta: su próxima sesión, empezarla u omitirla | Autenticado |
| `/athletes/:athleteId` | Resumen del atleta: avisos, carga semanal, adherencia, fuerza estimada por ejercicio | Autenticado (coach, relación activa) |
| `/routines` | Biblioteca de rutinas: tarjetas con grupos musculares y totales, editar, borrar con confirmación | Autenticado (coach) |
| `/routines/new` | Constructor de rutinas: ejercicios como cadena de cuentas, buscador del catálogo, reordenar con flechas y panel de carga de la sesión (series, duración, volumen) | Autenticado (coach) |
| `/routines/:id` | El mismo constructor, para editar una rutina existente | Autenticado (coach dueño) |
| `/sessions/:id/registro` | Registro de una sesión por serie + cierre (esfuerzo, duración, dolor), pensado para el celular | Autenticado (atleta asignado) |
| `/athletes` | Invitar atletas + lista con su estado | Autenticado (coach) |
| `/cycles` | Planes: lista de ciclos + crear uno nuevo | Autenticado (coach) |
| `/cycles/:id` | Detalle de un plan: grid con el progreso real por celda y los avisos del plan | Autenticado (coach dueño o atleta asignado) |
| `/sessions/:id` | Detalle de una sesión: editar, agregar/quitar ejercicios del catálogo | Autenticado (coach dueño o atleta asignado) |

> Nota: los emails de verificación, recuperación de contraseña e invitación salen por Resend desde `hola@mail.getcycles.app`. Solo en desarrollo, sin `RESEND_API_KEY`, el enlace se escribe en el log de la API.

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
| Interno: resumen diario de actividad (solo GitHub Actions, con secreto) | `POST /internal/activity/daily-summary` | `docs/deploy/PLAN-Deploy.md`, paso 8 |

## Base de datos

- Postgres local, base `cycles_dev` (`apps/api/.env` → `DATABASE_URL`).
- Explorar visualmente: `npx prisma studio` desde `apps/api` (abre en el navegador, puerto que asigne Prisma).
- Consola: `psql cycles_dev`.

## Artifacts publicados (claude.ai)

| Qué es | Link |
|---|---|
| Diagrama del modelo relacional (interactivo) | https://claude.ai/artifact/Wdfz4Rcq2tXaibdpbTYXzK |
| Design System de Cycles (colores/tipografía/componentes, sincronizado contra el código) | https://claude.ai/artifact/Smf7SUnx1VMBv3nhbGv1aR |

> La versión "de registro" del mismo diagrama vive versionada en `docs/prds/PRD-General.md` (sección 6) y como archivo standalone en `docs/diagrams/modelo-relacional.html`.

## Documentación del proyecto

| Qué es | Path |
|---|---|
| PRD padre del producto | `docs/prds/PRD-General.md` |
| Visión de compañía | `docs/prds/VISION.md` |
| Arquitectura técnica | `docs/ARCHITECTURE.md` |
| Deuda técnica conocida | `docs/DEUDA-TECNICA.md` |
| Issues de UX/producto (para resolver una por una) | `docs/ISSUES.md` |
| Plan para pasar el estado del proyecto a Linear | `docs/PLAN-Linear.md` |
| Seguridad: archivos sensibles, reglas y auditoría | `docs/SEGURIDAD.md` |
| Plan de correcciones de seguridad | `docs/PLAN-Seguridad.md` |
| Pruebas manuales pendientes | `docs/PRUEBAS-PENDIENTES.md` |
| Plan de deploy (dominio, Resend, hosting) | `docs/deploy/PLAN-Deploy.md` |
| Estrategia de marca | `docs/brand/brand.md` |
| Identidad visual (decisiones de color/tipografía) | `docs/brand/identidad-visual.md` |
| Investigación competitiva | `docs/brand/investigacion-competitiva.md` |
| Índice de PRDs hijos por funcionalidad | `docs/prds/PRD-General.md` (sección 0) |

## Usuarios de prueba

| Rol | Email | Password |
|---|---|---|
| Coach | `coach.test@example.com` | `newpassword456` |
| Atleta | `atleta.test@example.com` | `athletepass123` |
