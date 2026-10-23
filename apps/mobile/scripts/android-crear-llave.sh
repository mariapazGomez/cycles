#!/usr/bin/env bash
# Crea la llave de subida de Android y carga sus datos como secretos de GitHub.
#
# Qué hace:
#   1. Te pide una contraseña (no se ve al escribirla ni se guarda en ningún
#      archivo del repositorio).
#   2. Crea la llave en ~/.cycles-secretos/android/cycles-upload.keystore
#      (fuera del repositorio).
#   3. Sube la llave y sus datos como secretos de GitHub, sin mostrarlos.
#
# Importante: respalda la llave y la contraseña en DOS lugares (por ejemplo, tu
# gestor de contraseñas y un disco externo). Si se pierden, no se puede subir
# una versión nueva de la app sin pedirle a Google que restablezca la llave.
#
# Uso:  bash apps/mobile/scripts/android-crear-llave.sh
# Necesita: keytool (viene con Java) y gh (con sesión iniciada).
set -euo pipefail

REPO="mariapazGomez/cycles"
ALIAS="cycles-upload"
CARPETA="$HOME/.cycles-secretos/android"
LLAVE="$CARPETA/cycles-upload.keystore"

command -v keytool >/dev/null || { echo "Falta keytool (Java)."; exit 1; }
command -v gh >/dev/null || { echo "Falta gh (GitHub CLI)."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh no tiene sesión iniciada: corre 'gh auth login'."; exit 1; }

if [ -e "$LLAVE" ]; then
  echo "Ya existe una llave en $LLAVE."
  echo "No la reemplazo para no perderla. Si de verdad quieres crear otra, muévela primero."
  exit 1
fi

read -r -s -p "Contraseña de la llave (mínimo 8 caracteres): " CLAVE; echo
read -r -s -p "Repite la contraseña: " CLAVE2; echo
[ "$CLAVE" = "$CLAVE2" ] || { echo "Las contraseñas no coinciden."; exit 1; }
[ "${#CLAVE}" -ge 8 ] || { echo "La contraseña es muy corta."; exit 1; }

mkdir -p "$CARPETA"
chmod 700 "$HOME/.cycles-secretos" "$CARPETA"

export CYCLES_CLAVE="$CLAVE"
keytool -genkeypair -storetype PKCS12 \
  -keystore "$LLAVE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Cycles, O=Cycles, C=CL" \
  -storepass:env CYCLES_CLAVE -keypass:env CYCLES_CLAVE
chmod 600 "$LLAVE"

# Los valores van por entrada estándar para que no aparezcan en la lista de procesos.
base64 < "$LLAVE" | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64 -R "$REPO"
printf '%s' "$CLAVE" | gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO"
printf '%s' "$CLAVE" | gh secret set ANDROID_KEY_PASSWORD -R "$REPO"
printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS -R "$REPO"

echo
echo "Listo. La llave quedó en: $LLAVE"
echo "Huella de la llave (SHA-256), por si Google la pide:"
keytool -list -v -keystore "$LLAVE" -alias "$ALIAS" -storepass:env CYCLES_CLAVE | grep "SHA256:"
unset CYCLES_CLAVE CLAVE CLAVE2
echo
echo "Ahora respalda el archivo y la contraseña en dos lugares distintos."
