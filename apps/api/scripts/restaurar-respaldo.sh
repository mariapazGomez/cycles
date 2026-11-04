#!/usr/bin/env bash
# Restaura un respaldo cifrado de la base (CYC-43) en una base LOCAL de prueba
# para comprobar que sirve. Nunca toca producción.
# Ver docs/deploy/RESPALDOS.md.
#
# Uso:
#   bash apps/api/scripts/restaurar-respaldo.sh <archivo.dump.age> [base_destino]
#
# Descifra con la clave privada de ~/.cycles-secretos/respaldo-age.key (o la que
# indique RESPALDO_AGE_KEY), crea la base `cycles_restore_test` (o la que pases)
# en el Postgres local, restaura y muestra solo conteos de filas por tabla,
# nunca datos de personas. Necesita: age, pg_restore, psql, createdb.
set -euo pipefail

ARCHIVO="${1:-}"
DESTINO="${2:-cycles_restore_test}"
CLAVE="${RESPALDO_AGE_KEY:-$HOME/.cycles-secretos/respaldo-age.key}"

if [ -z "$ARCHIVO" ] || [ ! -f "$ARCHIVO" ]; then
  echo "Uso: bash apps/api/scripts/restaurar-respaldo.sh <archivo.dump.age> [base_destino]" >&2
  exit 1
fi
if [ ! -f "$CLAVE" ]; then
  echo "No encuentro la clave privada en $CLAVE (búscala en 1Password)." >&2
  exit 1
fi
case "$DESTINO" in
  *prod*|*supabase*) echo "Por seguridad, el destino no puede llevar «prod» ni «supabase» en el nombre." >&2; exit 1 ;;
esac

# pg_restore: el de la versión del servidor (17) o más nueva, igual que en el respaldo.
PG_RESTORE=""
for candidate in "$HOME/.local/pg17/bin/pg_restore" /opt/homebrew/opt/libpq/bin/pg_restore /usr/local/opt/libpq/bin/pg_restore /opt/homebrew/opt/postgresql@17/bin/pg_restore "$(command -v pg_restore || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then PG_RESTORE="$candidate"; break; fi
done
if [ -z "$PG_RESTORE" ]; then
  echo "No encontré pg_restore. Instálalo con: brew install libpq" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
umask 077

age -d -i "$CLAVE" -o "$TMP/respaldo.dump" "$ARCHIVO"

dropdb --if-exists "$DESTINO"
createdb "$DESTINO"
# Dos avisos son normales en un Postgres local: «transaction_timeout» (es de la 17)
# y «schema public already exists». Cualquier otro error sí se muestra.
"$PG_RESTORE" --no-owner --no-acl -d "$DESTINO" "$TMP/respaldo.dump" 2>"$TMP/errores.txt" || true
grep -vE 'transaction_timeout|schema "public" already exists|CREATE SCHEMA public|^Command was: SET|errors ignored on restore|^$' "$TMP/errores.txt" || true

echo "Restaurado en la base local «$DESTINO». Filas por tabla:"
psql "$DESTINO" -Atc "
  select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
  from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1" | sed 's/|/  /'
echo "Cuando termines: dropdb $DESTINO"
