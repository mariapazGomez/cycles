---
type: plan
status: draft
created: 2026-09-27
---

# Plan — Pasar el estado del proyecto a Linear

No ejecutado todavía (decisión 2026-09-27: dejar solo documentado, decidir después cómo importarlo). Este documento es el contenido exacto que se crearía en Linear cuando se decida el método de importación.

## 0. Restricción de acceso

Esta sesión no tiene un servidor MCP de Linear conectado ni credenciales de la API. Para ejecutar este plan hace falta uno de:
- **API key personal de Linear** (Settings → API → Personal API keys) → se crea todo vía su API GraphQL con `curl`, sin instalar nada.
- **Importación CSV** → se genera un `.csv` con el formato que Linear acepta (Title, Description, Status, Priority, Labels, Project) y se importa a mano desde la UI de Linear (Settings → Import/Export).

## 1. Team

Un solo team: **Cycles**. El proyecto es chico (una sola persona + Claude); no hace falta más de un team todavía.

## 2. Projects

Uno por fase del roadmap (`docs/prds/PRD-General.md` §10), más uno aparte para la app móvil porque ya tiene vida propia aunque el roadmap oficial recién la ubica en Fase 4:

| Project | Estado | Resumen |
|---|---|---|
| **Fase 1 — Auth & onboarding** | Casi cerrado | Login/registro manual + Google, verificación de email, reset de contraseña. Funcionalmente completo; el PRD sigue marcado `in-progress` porque nunca se actualizó el status field. |
| **Fase 2 — Planificación** | Casi cerrado | Invitación de atletas, catálogo de ejercicios, rutinas + programación en grid. `PRD-RutinasYProgramacion` ya está `complete`; queda un ítem opcional de baja prioridad (ver backlog). |
| **Fase 3 — Ejecución y seguimiento** | Backend + frontend web hechos | Registro de series con RIR, feedback de sesión, seguimiento del coach (`/coach/attention`, resumen de atleta, ajustes de carga). Mergeado a `main`. |
| **Fase 3.5 — Piloto (actual)** | En curso | Deploy completo (`getcycles.app`, Resend, Supabase, Render, Vercel), tanda 1 de seguridad, avisos de actividad a Slack. Ver `docs/deploy/PLAN-Deploy.md` y `docs/PLAN-Seguridad.md`. Termina con 2–3 coaches reales usando la app. |
| **App móvil (atleta)** | MVP funcional, sin mergear | Login → Hoy → registro de series → cierre de sesión, probado de punta a punta contra la API real. Vive en la rama `worktree-mobile-app`, pusheada a origin, sin PR abierto todavía. |

## 3. Labels

| Label | Color sugerido | Uso |
|---|---|---|
| `tech-debt` | gris | Ítems de `docs/DEUDA-TECNICA.md` |
| `bug` | rojo | Comportamiento roto o inesperado |
| `ux` | violeta | Ítems de `docs/ISSUES.md` |
| `mobile` | celeste | Específico de `apps/mobile` |
| `web` | azul | Específico de `apps/web` |
| `api` | verde | Específico de `apps/api` |
| `security` | naranja | De `docs/PLAN-Seguridad.md` / `docs/SEGURIDAD.md` |

## 4. Backlog — Fase 3.5 (Piloto, actual)

Ya trackeado en detalle en `docs/deploy/PLAN-Deploy.md` y `docs/PLAN-Seguridad.md` (pasos numerados, con checklist propio). No se duplica acá línea por línea — si se decide migrar a Linear, la forma más simple es crear un issue por paso de esos dos documentos dentro de este project, en vez de reinventar la lista.

## 5. Backlog — Deuda técnica (`docs/DEUDA-TECNICA.md`)

Prioridad mapeada desde el "Impacto" ya documentado (alto → Urgent, medio-alto/medio-alto → High, medio → Medium, bajo/bajo-medio → Low).

| # | Título | Project | Labels | Prioridad |
|---|---|---|---|---|
| 1 | No hay tests automatizados en ningún workspace | Fase 3.5 — Piloto | `tech-debt` | Urgent |
| 2 | ESLint no está realmente instalado en apps/web ni apps/api | Fase 3.5 — Piloto | `tech-debt`, `web`, `api` | Medium |
| 3 | No hay CI | Fase 3.5 — Piloto | `tech-debt` | High |
| 4 | Design tokens de mobile son un espejo a mano, no compartidos de verdad | App móvil | `tech-debt`, `mobile`, `web` | Medium |
| 5 | Lógica de auth/HTTP duplicada entre web y móvil | App móvil | `tech-debt`, `mobile`, `web` | Medium |
| 6 | `packages/shared` se desincroniza del backend real | Fase 3.5 — Piloto | `tech-debt`, `api` | High |
| 7 | El fix de Metro para evitar React duplicado es frágil | App móvil | `tech-debt`, `mobile` | Medium |
| 8 | Tokens de sesión en AsyncStorage plano (sin Keychain) | App móvil | `tech-debt`, `mobile`, `security` | Low |
| 9 | `API_URL` hardcodeada en la app móvil | App móvil | `tech-debt`, `mobile` | Urgent (bloquea probar fuera del simulador) |
| 10 | Expiración real del refresh token no desloguea al usuario (mobile) | App móvil | `bug`, `mobile` | Medium |
| 11 | Sin error boundary ni reporte de crashes (mobile) | App móvil | `tech-debt`, `mobile` | Medium |
| 12 | Migraciones de Prisma generadas a mano | Fase 3.5 — Piloto | `tech-debt`, `api` | Low |

## 6. Backlog — Issues de UX (`docs/ISSUES.md`)

| # | Título | Project | Labels | Prioridad |
|---|---|---|---|---|
| 1 | Armar un plan no tiene cierre ni confirmación de asignación; un atleta puede ver planes en `draft` | Fase 2 — Planificación | `ux`, `bug`, `web` | High |
| 2 | La vista del plan es la misma para coach y atleta — debería diferenciarse | Fase 2 — Planificación | `ux`, `web` | Medium |

## 7. Backlog — App móvil (trabajo restante, más allá de la deuda técnica ya listada)

| Título | Labels | Prioridad | Nota |
|---|---|---|---|
| Abrir PR y mergear `worktree-mobile-app` a `main` | `mobile` | Urgent | Todo el trabajo de la app vive sin mergear desde el 2026-09-25. |
| Decidir identidad visual de la app móvil (¿comparte la de la web o tiene la suya?) | `mobile`, `ux` | Medium | Decisión abierta, ver `PRD-AppMovilAtleta.md` §5. |
| Evaluar Android | `mobile` | Low | Explícitamente pospuesto, sin fecha. |
| Config de entornos (staging/producción) para reemplazar `API_URL` hardcodeada | `mobile` | Urgent | Bloquea TestFlight/dispositivo físico. Overlap con ítem 9 de deuda técnica — un solo issue cubre ambos. |

## 8. Ítems sueltos de Fase 2 (menores, no bloqueantes)

| Título | Project | Labels | Prioridad |
|---|---|---|---|
| Pantalla de gestión del catálogo de ejercicios propios (paso 5 opcional de `PRD-FrontendPlanificacion`) | Fase 2 — Planificación | `web` | Low |

## 9. Total

**5 projects**, **7 labels**, **19 issues** de contenido concreto (12 deuda técnica + 2 UX + 4 app móvil + 1 Fase 2 menor), más los pasos de Fase 3.5 que ya viven en `PLAN-Deploy.md`/`PLAN-Seguridad.md` y se migrarían tal cual si se decide llevarlos a Linear también.

## 10. Próximo paso

Cuando se decida cómo importar (API key o CSV), este documento tiene todo el contenido necesario para generarlo sin volver a investigar el estado del proyecto.
