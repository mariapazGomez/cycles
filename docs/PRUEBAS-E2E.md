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

- Sumar a la matriz los endpoints de `/users/me` para borrar la cuenta, exportar y retirar el consentimiento (PR de CYC-107, aún sin mezclar al crear esta guía).
- Cubrir el límite de intentos (429), que hoy el arnés evita a propósito.
- Un access token de una cuenta ya eliminada sigue valiendo hasta que vence (15 minutos): la estrategia JWT no consulta la base. Las rutas que usan datos de esa persona fallan igual, pero conviene decidir si se acepta o se revisa la cuenta en cada pedido.
