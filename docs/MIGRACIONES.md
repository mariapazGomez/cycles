---
type: guide
status: active
created: 2026-11-01
updated: 2026-11-01
tags: [base-de-datos, prisma, procedimiento]
---

# Migraciones de Prisma: cómo se hacen en Cycles

Procedimiento para cambiar el esquema de la base (`apps/api/prisma/schema.prisma`) sin romper producción. Probado el 2026-11-01 contra una base local descartable. Los comandos se corren en `apps/api`.

## Reglas

1. **Una migración ya aplicada nunca se edita.** Si se equivocó, se corrige con otra migración nueva.
2. **Siempre compatible hacia atrás.** La app iOS ya instalada y la web en caché siguen hablando con la API nueva, y la API anterior puede seguir atendiendo unos instantes mientras se despliega. Por eso una migración solo **agrega** (columna que admite nulos o con valor por defecto, tabla nueva, índice). Quitar o renombrar una columna, o volverla obligatoria sin valor por defecto, se hace en **dos entregas**: primero el código deja de usarla, y en un PR posterior se borra.
3. **En producción solo `prisma migrate deploy`.** Nunca `migrate dev`, `migrate reset` ni `db push`: pueden borrar datos.
4. **`ExerciseLog` y `SessionFeedback` son append-only** (SEGURIDAD.md, R7): una migración no hace `UPDATE` ni `DELETE` sobre ellas. La base lo impone con triggers desde 2026-11-01 (S-12): un `UPDATE` o `DELETE` sobre ellas da error. Para una corrección excepcional (solo con respaldo y con aviso a la fundadora) la migración o el script declara la excepción dentro de su transacción: `SET LOCAL cycles.allow_purge = 'on';`. El borrado de cuenta desde la app ya lo hace.
5. **Respaldo antes de migrar producción:** `bash apps/api/scripts/respaldo-supabase.sh` (ver `docs/deploy/PLAN-Deploy.md`, 2.5).
6. Ninguna URL ni contraseña de la base en el repo, en la migración ni en el chat.

## Por qué no se usa `migrate dev`

`prisma migrate dev` pide una terminal interactiva y el entorno de desarrollo no la tiene. Las migraciones se generan con `prisma migrate diff` (que escribe el SQL) y se aplican con `migrate deploy`. Es manual, así que el paso de revisión del SQL (paso 4) es obligatorio.

## Paso a paso

1. **Cambia `schema.prisma`.**
2. **Crea una base sombra vacía** (descartable, solo para comparar):

   ```bash
   createdb cycles_sombra
   ```

3. **Genera el SQL** comparando las migraciones ya existentes con el esquema nuevo. El nombre de la carpeta es `AAAAMMDDHHMMSS_nombre_en_snake_case` (ejemplo: `20261030120000_ejercicio_implementos`); la fecha debe ser posterior a la última migración:

   ```bash
   mkdir prisma/migrations/20261101120000_nombre_del_cambio
   npx prisma migrate diff \
     --from-migrations prisma/migrations \
     --to-schema-datamodel prisma/schema.prisma \
     --shadow-database-url postgresql://$USER@localhost:5432/cycles_sombra \
     --script > prisma/migrations/20261101120000_nombre_del_cambio/migration.sql
   ```

   Si la base local ya está al día, también sirve `--from-url "$DATABASE_URL"` en lugar de `--from-migrations` y la base sombra.
4. **Revisa el SQL a mano.** Abre el archivo y comprueba:
   - Que solo contenga lo que querías (sin `DROP` inesperados). Si el diff incluye un `DROP`, detente y aplica la regla 2.
   - Que lleve un **comentario al inicio**, en español, con el porqué del cambio y qué pasa con los datos existentes (todas las migraciones del repo lo tienen).
   - Lo que Prisma no puede expresar se agrega a mano: restricciones `CHECK` (por ejemplo `active IN (0, 1)`), relleno de datos (`UPDATE ... SET`) o índices parciales. Ver `20261002120000_session_feedback_active` como ejemplo.
5. **Aplícala en local y verifica:**

   ```bash
   npx prisma migrate deploy      # aplica las pendientes
   npx prisma migrate status      # debe decir «Database schema is up to date!»
   npx prisma generate            # regenera el cliente tipado
   ```

   Para comprobar que el esquema y las migraciones coinciden, el `diff` contra la base local no debe mostrar cambios:

   ```bash
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
   # → «-- This is an empty migration.»
   ```

6. **Corre los tests y el typecheck** (`npm test --workspace apps/api`, `npx tsc --noEmit -p apps/api`) y borra la base sombra (`dropdb cycles_sombra`).
7. **Commitea** `schema.prisma` y la carpeta de la migración **juntos**, en el mismo PR que usa el cambio. La descripción del PR dice que lleva migración, qué hace y si es compatible hacia atrás.
8. **Actualiza la documentación** (checklist de PRD-General §10.1): el diagrama del modelo de datos (§6 de [[PRD-General]] y `docs/diagrams/modelo-relacional.html`) y el PRD de la funcionalidad.

## Qué pasa al desplegar

Render corre `prisma migrate deploy` al **final del build**, después de compilar (`render.yaml`). Entonces:

- Si el build falla antes, **no se migra**.
- Al mezclar el PR en `main`, la migración se aplica sola en Supabase. Orden seguro: respaldo → mezclar → esperar el deploy → comprobar `GET https://api.getcycles.app/health` y que `prisma migrate status` no tenga pendientes → probar a mano lo que cambió. Un ejemplo completo está en `docs/deploy/PLAN-Deploy.md`, 2.5.1.
- Para el `migrate status` de producción, carga la URL desde `~/.cycles-secretos/produccion.env` (nunca la imprimas ni la pegues en un chat).

## Si una migración falla en producción

1. No edites la migración. Mira el error del build en Render.
2. Si falló antes de aplicarse nada, corrige con una migración nueva y vuelve a desplegar: la API anterior sigue sirviendo.
3. Si quedó a medias (algunas sentencias aplicadas), restaura desde el respaldo o corrige a mano la base y marca el resultado con `prisma migrate resolve` según la guía de Prisma, y **avisa a la fundadora antes** de tocar producción.

## Datos de demostración y local

- Bases locales de prueba: crea y borra las tuyas (`createdb`/`dropdb`); nunca apuntes un script de prueba a la URL de producción.
- El catálogo de ejercicios se carga con `npx prisma db seed` (`prisma/seed.ts`); no es una migración.
