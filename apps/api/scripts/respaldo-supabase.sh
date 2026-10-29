#!/usr/bin/env bash
# Respaldo de la base de producción (Supabase) a un archivo local, fuera del
# repo. Ver docs/deploy/PLAN-Deploy.md, 2.5: se hace cada semana y antes de cada
# migración nueva.
#
# Uso, desde la raíz del proyecto:
#   bash apps/api/scripts/respaldo-supabase.sh
#
# Lee SUPABASE_DATABASE_URL de ~/.cycles-secretos/produccion.env (o del entorno). La URL lleva la
# contraseña, así que este script nunca la imprime.
#
# El archivo trae datos de personas: se guarda en ~/Respaldos-Cycles con
# permisos solo para ti (o en RESPALDO_DIR). Nunca en el repo, que es público,
# ni en un chat. Para guardarlo también en Google Drive, copia el archivo a una
# carpeta privada.
#
# Necesita un pg_dump de la versión del servidor o más nueva (Supabase usa
# Postgres 17): brew install libpq
#
# Retención: la política de privacidad promete conservar los respaldos hasta
# 90 días. Tras un respaldo exitoso se borran los cycles-*.dump más antiguos que
# RESPALDO_DIAS (90 por defecto) de esa misma carpeta.
set -euo pipefail

# La URL de producción vive fuera del repo y lejos del .env de desarrollo:
# ~/.cycles-secretos/produccion.env (permisos 600). Si no está ahí, se prueba
# con apps/api/.env y con el entorno.
SECRETOS_FILE="$HOME/.cycles-secretos/produccion.env"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
DEST="${RESPALDO_DIR:-$HOME/Respaldos-Cycles}"
DIAS="${RESPALDO_DIAS:-90}"

for archivo in "$SECRETOS_FILE" "$ENV_FILE"; do
  if [ -z "${SUPABASE_DATABASE_URL:-}" ] && [ -f "$archivo" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$archivo"
    set +a
  fi
done
if [ -z "${SUPABASE_DATABASE_URL:-}" ]; then
  echo "Falta SUPABASE_DATABASE_URL (en ~/.cycles-secretos/produccion.env o en el entorno)." >&2
  exit 1
fi

# pg_dump: el de libpq (más nuevo) si existe; si no, el del PATH.
PG_DUMP=""
for candidate in "$HOME/.local/pg17/bin/pg_dump" /opt/homebrew/opt/libpq/bin/pg_dump /usr/local/opt/libpq/bin/pg_dump "$(command -v pg_dump || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then PG_DUMP="$candidate"; break; fi
done
if [ -z "$PG_DUMP" ]; then
  echo "No encontré pg_dump. Instálalo con: brew install libpq" >&2
  exit 1
fi

mkdir -p "$DEST"
chmod 700 "$DEST"
FILE="$DEST/cycles-$(date +%Y-%m-%d-%H%M).dump"

# -Fc: formato comprimido que se restaura con pg_restore.
# --schema=public: solo las tablas de Cycles; sin los esquemas internos de
# Supabase (vault, auth, storage…), que no son nuestros y estorban al restaurar.
# --no-owner / --no-acl: sin dueños ni permisos de Supabase, para poder
# restaurarlo en una base local.
ERR="$(mktemp)"
if ! "$PG_DUMP" "$SUPABASE_DATABASE_URL" -Fc --schema=public --no-owner --no-acl -f "$FILE" 2>"$ERR"; then
  sed -E 's#postgres(ql)?://[^ ]*#<url oculta>#g' "$ERR" >&2
  rm -f "$ERR" "$FILE"
  echo "El respaldo falló; no quedó ningún archivo a medias." >&2
  exit 1
fi
rm -f "$ERR"
chmod 600 "$FILE"
echo "Respaldo listo: $FILE ($(du -h "$FILE" | cut -f1))"

# Retención: solo después de un respaldo exitoso (nunca se borra el único que hay)
# y solo archivos con el nombre de este script.
VIEJOS="$(find "$DEST" -maxdepth 1 -type f -name 'cycles-*.dump' -mtime "+$DIAS" | wc -l | tr -d ' ')"
if [ "$VIEJOS" -gt 0 ]; then
  find "$DEST" -maxdepth 1 -type f -name 'cycles-*.dump' -mtime "+$DIAS" -delete
  echo "Retención: borré $VIEJOS respaldo(s) de más de $DIAS días."
fi
