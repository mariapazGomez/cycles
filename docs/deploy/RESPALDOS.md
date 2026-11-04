# Respaldos automáticos de la base (CYC-43)

La base de producción (Supabase, plan gratuito) no trae respaldos descargables, así que Cycles se respalda sola con GitHub Actions. Nadie ejecuta nada a mano.

## Cómo funciona

| Pieza | Qué hace |
|---|---|
| `.github/workflows/respaldo.yml` | Corre **los lunes a las 07:30 UTC** y **a pedido**. Vuelca el esquema `public` con `pg_dump` 17, lo **cifra con age** mientras sale (nunca queda sin cifrar en disco), lo sube a un bucket **privado** de Cloudflare R2 y borra los de más de **28 días**. |
| `.github/workflows/respaldo-previo-migracion.yml` | En los PR que tocan `apps/api/prisma/migrations/` falla si no hay un respaldo exitoso de las últimas 24 horas. |
| Aviso | Si algo falla, un mensaje al Slack de actividad con el enlace a la ejecución. GitHub además avisa por correo a quien creó el workflow. |
| `apps/api/scripts/restaurar-respaldo.sh` | Descifra un respaldo y lo restaura en una base **local** para comprobarlo. Nunca toca producción. |
| `apps/api/scripts/respaldo-supabase.sh` | El respaldo manual de antes (sin cifrar, en `~/Respaldos-Cycles`). Queda como plan B. |

**Privacidad (reglas R1–R12 y GDPR).** Los respaldos traen datos de personas, por eso: bucket privado (nunca artefactos de GitHub, el repositorio es público); cifrado con una clave **pública** que vive en el workflow, así que nadie con acceso a los secretos puede leer un respaldo; retención de 28 días, dentro de los 90 que promete la política de privacidad; la URL de la base solo existe como secreto y no se imprime.

## Antes de una migración

La sesión que prepara una migración dispara el respaldo ella misma y espera a que termine, sin pedírselo a la usuaria:

```bash
gh workflow run respaldo.yml -f motivo=pre-migracion
gh run watch "$(gh run list --workflow respaldo.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

El PR de la migración lleva el chequeo «Respaldo previo a migraciones»: si está en rojo, falta ese paso.

## Configuración (una sola vez, la hace la usuaria)

1. **Bucket privado en Cloudflare R2:** crea un bucket (por ejemplo `cycles-respaldos`) sin acceso público y un token de API de R2 con permiso de lectura y escritura **solo sobre ese bucket**.
2. **Secretos de Actions** (Settings → Secrets and variables → Actions → *New repository secret*). Nunca van al repo, a Linear ni a un chat:

   | Secreto | Qué es |
   |---|---|
   | `SUPABASE_DATABASE_URL` | La URL de conexión del *pooler* de Supabase (la misma de `~/.cycles-secretos/produccion.env`). |
   | `R2_ENDPOINT` | `https://<id-de-cuenta>.r2.cloudflarestorage.com` |
   | `R2_BUCKET` | El nombre del bucket. |
   | `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` | Las credenciales del token de R2. |
   | `SLACK_WEBHOOK_URL` | El mismo webhook de Slack que ya usa la API en Render. |

3. **La clave privada de age** está en `~/.cycles-secretos/respaldo-age.key` (permisos 600), generada en el equipo de la usuaria. **Guárdala también en 1Password**: sin ella, ningún respaldo se puede abrir y no hay forma de recuperarla.
4. Primera ejecución: Actions → *Respaldo de la base* → *Run workflow*. Comprueba que aparezca el archivo en el bucket.

## Restaurar (y probar que sirve)

1. Baja el respaldo del bucket (consola de R2 o `aws s3 cp s3://<bucket>/<archivo>.dump.age . --endpoint-url <R2_ENDPOINT>`).
2. Restáuralo en una base **local**:

   ```bash
   bash apps/api/scripts/restaurar-respaldo.sh cycles-AAAA-MM-DD-HHMM-semanal.dump.age
   ```

   Descifra con la clave privada, crea `cycles_restore_test`, restaura y muestra el conteo de filas por tabla. Termina con `dropdb cycles_restore_test`.
3. Para recuperar producción de verdad: restaurar sobre una base nueva de Supabase y apuntar la API a ella. Hazlo solo con la usuaria y con la lista de qué se pierde desde el respaldo.

**Prueba hecha (2026-11-04):** el respaldo de producción del 2026-11-03 se cifró con la clave pública, se descifró con la privada y se restauró en Postgres local: 23 tablas, incluidas 15 cuentas y las 27 migraciones aplicadas. Dos avisos de `pg_restore` son normales en un Postgres local (`transaction_timeout`, que es de la 17, y «schema public already exists»).

## Si el respaldo falla

- **Slack avisa:** abre el enlace y mira el paso en rojo. «Faltan secretos» = falta cargar alguno. Fallo del volcado = revisa que Supabase esté arriba y que la URL del *pooler* siga siendo válida.
- Mientras no se arregle, usa el plan B: `bash apps/api/scripts/respaldo-supabase.sh` (guarda sin cifrar en `~/Respaldos-Cycles`).
- GitHub puede atrasar horas las ejecuciones programadas; un respaldo semanal que llega tarde no es un fallo.
