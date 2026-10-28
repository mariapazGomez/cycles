# Auditoría de secretos (2026-10-28)

Tarea CYC-154. Revisión de solo lectura del repo, de su historial de Git y de las carpetas locales. **Este informe contiene rutas y nombres de variables, nunca valores.**

## Resultado en una línea

**No hay ningún secreto en el repo ni en su historial.** Lo que hay que corregir está en tu equipo local (permisos y un secreto fuera de lugar), no en GitHub.

## 1. Repo y historial de Git

- El repo es **público** (`mariapazGomez/cycles`). Se revisaron los 280 commits de todas las ramas (35 ramas remotas) y el árbol actual.
- Método: búsquedas con `git log --all -G<patrón>` (regex sobre los cambios de cada commit) y `git grep` sobre el árbol, sin instalar herramientas nuevas. Se validó el método con una búsqueda de control que sí encuentra coincidencias.
- Patrones buscados, **todos con 0 coincidencias**: clave privada PEM, webhooks de Slack, claves de Resend, secreto de Google (`GOCSPX-`), tokens de GitHub y de Slack, claves AWS, JWT firmados, claves de PostHog, secretos hexadecimales asignados, clave de Apple (`APPLE_PRIVATE_KEY=`), contraseñas de keystore, URLs con usuario y contraseña, y literales del tipo `password|secret|token|api_key = "…"`.
- **Una coincidencia, falsa:** la búsqueda de «URL de base de datos con contraseña» encuentra 4 commits que tocan `apps/api/.env.example` y `docs/deploy/PLAN-Deploy.md`. Revisados: la contraseña es el marcador `password` en el ejemplo y `[YOUR-PASSWORD]` en el plan de deploy. No hay nada que rotar.
- Archivos rastreados que merecen mención:
  - `apps/api/.env.example` y `apps/web/.env.example`: solo marcadores.
  - `apps/mobile/android/app/debug.keystore`: es la llave de **depuración** estándar de React Native (contraseña pública conocida), no la de publicación. No es un secreto.
- Historial: ningún archivo `.env`, llave (`.keystore`, `.jks`, `.p8`, `.p12`, `.pem`) ni volcado de base de datos fue subido y luego borrado.
- Secretos de GitHub Actions usados (solo nombres): `ACTIVITY_CRON_SECRET`, `ANDROID_KEYSTORE_BASE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Se leen de `secrets.*`, no están en el código.

## 2. Archivos locales con secretos (fuera del repo)

Todos están cubiertos por `.gitignore` (`.env` ignora cualquier `.env` en cualquier carpeta). Permisos y contenido por nombre:

| Ruta | Permisos | Qué guarda (solo nombres) |
|---|---|---|
| `.env` (raíz) | 644 | `LINEAR_API_KEY` |
| `apps/api/.env` | 644 | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CALLBACK_URL`, `APPLE_CALLBACK_URL`, `FRONTEND_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `SLACK_SECURITY_WEBHOOK_URL`, `SLACK_ACTIVITY_WEBHOOK_URL`, `SLACK_CONTACT_WEBHOOK_URL`, `SLACK_CONTACT_SEND_IN_DEV`, `SUPABASE_DATABASE_URL`. Vacías: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_*` (cuatro), `MAIL_REPLY_TO` |
| `apps/web/.env` | 644 | `VITE_API_URL`, **`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`** |
| `~/.cycles-secretos/android/cycles-upload.keystore` | 600 | Llave de publicación de Android |
| `~/.cycles-secretos/demo/DEMO_PASSWORD` | 600 | Contraseña de las cuentas de la demo |
| `~/.cycles-secretos/demo/cycles_demo-antes-2026-10-27.sql` | 600 | Respaldo de la base demo (con hashes de contraseñas ficticias) |
| `.claude/`, `content/` | — | Sin secretos (solo configuración y scripts de video). Son carpetas **sin rastrear y sin ignorar** (ver hallazgo 6) |

Las copias de trabajo en `.claude/worktrees/*` solo traen los `.env.example`; ninguna tiene un `.env` real.

### Scripts que piden o guardan secretos

| Script | Qué hace con secretos |
|---|---|
| `apps/api/scripts/respaldo-supabase.sh` | Lee `SUPABASE_DATABASE_URL` de `apps/api/.env`. El respaldo queda con permisos 700 (carpeta) y 600 (archivo). |
| `apps/mobile/scripts/android-crear-llave.sh` | Pide la contraseña de la llave sin mostrarla (`read -s`), crea el keystore en `~/.cycles-secretos/android` (700/600) y la sube a GitHub Actions con `gh secret set`. |
| `apps/api/scripts/seed-demo.ts` | Recibe `DEMO_PASSWORD` por variable de entorno; se niega a correr si la base no es `cycles_demo`. |

## 3. Hallazgos y qué hacer

| # | Prioridad | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | ~~Media~~ **Resuelto (2026-10-28)** | `apps/api/.env` incluía **`SUPABASE_DATABASE_URL`** (la base de producción) además de claves reales de **Resend** y webhooks reales de **Slack**. Una API local arrancada con ese archivo puede enviar correos y mensajes reales (pasó por poco al grabar demos). | Aplicado: la URL de producción pasó a `~/.cycles-secretos/produccion.env` (600) y `respaldo-supabase.sh` la lee de ahí; Resend y los tres webhooks de Slack quedaron vacíos en `apps/api/.env`. Se verificó que la API arranca y deja los correos y avisos en el log. Los valores originales siguen en 1Password. |
| 2 | ~~Media~~ **Resuelto (2026-10-28)** | `apps/web/.env` tenía `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. Un secreto de servidor no debe estar en la carpeta de la web. Vite solo publica variables `VITE_*`, así que no sale en el navegador, pero no tiene función ahí y es un riesgo de copia accidental. | Aplicado: las dos variables pasaron a `apps/api/.env` (donde las lee la API; estaban vacías) y se quitaron de la web. Rotar el secreto sigue siendo opcional. |
| 3 | ~~Baja~~ **Resuelto (2026-10-28)** | Los tres `.env` tenían permisos **644**: cualquier otro usuario del equipo puede leerlos. | Aplicado: `chmod 600` a los tres. |
| 4 | ~~Baja~~ **Resuelto (2026-10-28)** | `.gitignore` solo cubría `.env` y `.env.local`. Un `.env.production` o `.env.staging` se podría subir sin querer. | Aplicado: `.env.*` ignorado, con `!.env.example` para que los ejemplos sigan en el repo. |
| 5 | Media | La llave de publicación de Android (`cycles-upload.keystore`) y su contraseña existen en un solo equipo. Si se pierden, no se pueden publicar actualizaciones de la app con la misma identidad. | Guardar el archivo y las contraseñas en 1Password (bóveda de secretos de producción) y probar que se puede restaurar. |
| 6 | Baja | `.claude/` y `content/` aparecen sin rastrear. Un `git add -A` descuidado los subiría. Hoy no contienen secretos. | Parcial (2026-10-28): se ignoran `.claude/worktrees/` y `.claude/settings.local.json`. Queda decidir si `.claude/launch.json` y `content/video/` (scripts de grabación) van al repo o se ignoran. |
| 7 | Baja | `LINEAR_API_KEY` vive en un `.env` de la raíz. | Moverla a 1Password (CYC-153) y rotarla si alguna vez se copió a otro lado. |

## 4. Qué rotar

**Nada es obligatorio por esta auditoría:** ningún valor apareció en el repo ni en su historial. Rotar solo por precaución en estos casos:

- El **secreto de Google** que está en `apps/web/.env` (hallazgo 2), si es real.
- Cualquier clave que hayas **copiado alguna vez fuera de tu equipo** (chats, notas, capturas). Esta auditoría no puede verlo.
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`: confirma en Render que **no son los mismos** que los de tu `.env` local. Si lo fueran, una API local podría emitir tokens válidos para producción.

## 5. Lo que esta auditoría no cubre

- El historial de la terminal (`~/.zsh_history`) y el portapapeles: ahí pueden haber quedado valores pegados.
- Las variables de entorno de Render, Supabase, Cloudflare y GitHub Actions: no se pueden leer desde aquí.
- Los volcados de base de datos fuera de `~/.cycles-secretos/` (por ejemplo en Descargas).
- Los PR, issues y comentarios de GitHub y los textos de Linear: solo se revisó el contenido del repo.

Siguiente paso: la tarea de migración a 1Password (CYC-153) y el inventario de cuentas (CYC-152).
