#!/usr/bin/env bash
# Prueba de arranque de la app de Android en un emulador: instala el APK,
# lo abre y espera a ver la pantalla de inicio de sesión. Guarda una captura
# (pantalla-login.png) y el registro (logcat.txt) para revisarlos después.
# Uso: bash apps/mobile/scripts/android-smoke.sh <ruta-al-apk>
set -uo pipefail

APK="${1:?Falta la ruta al APK}"
PKG="app.getcycles.mobile"
SEEN=0

adb install -r "$APK" || { echo "No se pudo instalar el APK."; exit 1; }
adb logcat -c
adb shell am start -W -n "$PKG/.MainActivity"

for _ in $(seq 1 30); do
  sleep 3
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
  if grep -q "Entra a tu cuenta" ui.xml 2>/dev/null; then
    SEEN=1
    break
  fi
done

adb exec-out screencap -p > pantalla-login.png
adb logcat -d > logcat.txt

if grep -q "FATAL EXCEPTION" logcat.txt; then
  echo "La app se cerró con un error:"
  grep -A 12 "FATAL EXCEPTION" logcat.txt | head -40
  exit 1
fi

if [ "$SEEN" != 1 ]; then
  echo "No apareció la pantalla de inicio de sesión en 90 segundos."
  tail -40 logcat.txt
  exit 1
fi

echo "La app abrió y mostró la pantalla de inicio de sesión."
