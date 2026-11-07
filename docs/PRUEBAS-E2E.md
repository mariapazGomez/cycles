---
type: guide
status: active
created: 2026-11-01
updated: 2026-11-01
tags: [pruebas, seguridad, api]
---

# Pruebas de autorización de la API (e2e)

Pruebas que arrancan la API **real** contra una base PostgreSQL de pruebas y comprueban, endpoint por endpoint, que nadie ve ni toca lo que no es suyo ([[SEGURIDAD]], reglas R4 y R5, hallazgo S-11). Son distintas de las pruebas unitarias (`npm test`), que usan un Prisma simulado y no necesitan base.

## Qué cubren

| Archivo | Qué prueba |
|---|---|
| `apps/api/test/authz.e2e-spec.ts` | **Matriz de autorización**: para cada ruta protegida, sin sesión → 401; rol equivocado → 403; coach que no es dueño → 403 o 404; coach con la relación terminada → 403; atleta sobre datos de otro atleta → 403 o 404. Más pruebas «positivas»: cada persona ve lo suyo, el atleta conserva su historial aunque su relación terminó, y las listas, rutinas, ejercicios, avisos y plantillas de una persona no aparecen a otra. |
| `apps/api/test/tokens.e2e-spec.ts` | **Flujos de token**: login sin revelar si la cuenta existe; el refresh rota, su reuso revoca todas las sesiones y no sirve tras cerrar sesión; access token vencido, con otro secreto, sin firma o con el rol alterado; código de Google de un solo uso (vencido, repetido, dos pedidos simultáneos); recuperación de contraseña vencida o ya usada; registro cerrado y código del piloto; el secreto del resumen diario. |
| `apps/api/test/append-only.e2e-spec.ts` | **Registros históricos** (S-12): editar, reactivar, borrar o vaciar `ExerciseLog` y `SessionFeedback` da error (con Prisma, con SQL directo y con `TRUNCATE` en cascada); anular una fila sí se puede; la excepción `cycles.allow_purge` vale solo dentro de su transacción; reabrir una sesión y eliminar una cuenta siguen funcionando. |
| `apps/api/test/rate-limits.e2e-spec.ts` | **Límites de intentos** (S-01, S-13), con la misma lógica de IP real que producción (`True-Client-IP`): contacto 10 por hora por IP y 2 por día por correo, login 5 por minuto por correo y 20 por IP, registro 5 por hora. Inventar `X-Forwarded-For` no esquiva el límite, y otra IP no queda bloqueada. |
| `apps/api/test/pizarra.e2e-spec.ts` | **Pizarra del Resumen** (CYC-238): cada coach tiene la suya (la de otro no se ve ni se pisa, aunque el cuerpo traiga un `coachId`), el atleta no entra (403), la validación estricta del `PUT` (listas cerradas, ids únicos, los cinco del sistema, campos de más, tope de gráficos) y que eliminar la cuenta la borra. |
| `apps/api/test/progreso-ejercicios.e2e-spec.ts` | **Historial por ejercicio** (CYC-239): sin historial lista vacía; un ejercicio de una sola sesión no sale y con dos sí (promedios y series); no filtra la nota del coach; cada atleta ve solo lo suyo y conserva su historial tras terminar la relación; las series anuladas y las sesiones quitadas u omitidas no cuentan; el coach recibe 403. |
| `apps/api/test/contrato-resumen.e2e-spec.ts` | **Contrato API ↔ web del Resumen** (CYC-240): la respuesta real de `GET /athletes/:id/summary`, `GET /cycles/:id/progress` y `GET/PUT /coach/summary-layout` tiene la forma del ejemplo de `@cycles/shared` (`fixtures/resumen.ts`), el mismo que usa la web. Además prueba que el detector de forma detecta una respuesta distinta (la lección de CYC-249: una lista donde la API devolvía `{ exercises }`). |
| `apps/api/test/eventos.e2e-spec.ts` | **Actividades paralelas del atleta** (CYC-251): crear una serie y listarla ya expandida; editar y borrar «solo esta ocurrencia» o «toda la serie» (con 404 y 400 donde corresponde); el atleta ve y crea sin coach ni ciclo; cada atleta toca solo lo suyo; el coach vinculado lee **sin las notas** y otro coach o una relación terminada no; el coach no escribe; rango máximo; tope de actividades; la forma de las respuestas es la del ejemplo de `@cycles/shared` (contrato); va en la exportación de datos y se borra con la cuenta. |
| `apps/api/test/support/` | `app.ts` (arranque de la API, IP distinta por pedido para que el límite de intentos no estorbe, y la **guarda de seguridad**) y `seed.ts` (el escenario). |

El escenario (`seed.ts`): `coachA` con `athleteA` activo y `athleteC` con la relación terminada; `coachB` con `athleteB`. Cada coach tiene su plantilla, rutina y ejercicio propio.

## Cómo correrlas en local

1. Crea una base de pruebas **local** cuyo nombre termine en `_test` y aplica las migraciones:

   ```bash
   createdb cycles_e2e_test
   DATABASE_URL=postgresql://$USER@localhost:5432/cycles_e2e_test npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```

2. Corre las pruebas:

   ```bash
   TEST_DATABASE_URL=postgresql://$USER@localhost:5432/cycles_e2e_test npm run test:e2e --workspace apps/api
   ```

Las pruebas **vacían todas las tablas** de esa base. Por eso se niegan a correr si `TEST_DATABASE_URL` no apunta a `localhost` y a una base cuyo nombre termine en `_test` (`test/support/app.ts`). Nunca la apuntes a la base de desarrollo con datos que quieras conservar, ni a producción.

En GitHub corren solas en cada PR (job «API (autorización, con base de datos)» de `.github/workflows/ci.yml`, con un Postgres 17 como servicio).

## Qué hacer al crear o cambiar un endpoint

Todo endpoint nuevo con sesión se **agrega a la matriz** (`rows` en `authz.e2e-spec.ts`) con sus casos prohibidos, junto con el PR que lo crea. Es parte del checklist de seguridad de cierre de fase (PRD-General §10.1). Si el endpoint devuelve o modifica datos de una persona, suma además una prueba «positiva» de que otra persona no los ve.

## Cómo se comprobó que las pruebas detectan fallos

El 2026-11-01 se rompió a propósito el código y se comprobó que la matriz se pone en rojo, y luego se restauró:

- `hasActiveRelation` devolviendo siempre `true` → fallaron 15 casos de «relación terminada».
- Quitando el chequeo de dueño de las rutinas → fallaron los 3 casos de coach ajeno (leer, editar y borrar).

## Pendiente

- Los límites de intentos tienen su archivo propio (`rate-limits.e2e-spec.ts`); el resto del arnés usa una IP distinta por pedido para no tropezar con ellos.
- Un access token de una cuenta ya eliminada sigue valiendo hasta que vence (15 minutos): la estrategia JWT no consulta la base. Las rutas que usan datos de esa persona fallan igual, pero conviene decidir si se acepta o se revisa la cuenta en cada pedido.
