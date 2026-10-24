---
type: guide
parent: "[[PLAN-ANDROID-SEMANA]]"
status: in-progress
tags: [deploy, android]
created: 2026-10-23
updated: 2026-10-23
---

# Publicar la app de Android

Guía corta para generar el archivo que se sube a Google Play. Complementa [`PLAN-ANDROID-SEMANA.md`](PLAN-ANDROID-SEMANA.md). No hay Android Studio en el Mac: todo se compila en GitHub Actions (`.github/workflows/android.yml`).

## 1. Crear la llave de subida (una sola vez)

Desde la raíz del repositorio:

```bash
bash apps/mobile/scripts/android-crear-llave.sh
```

El script te pide una contraseña (no se ve al escribirla), crea la llave en `~/.cycles-secretos/android/cycles-upload.keystore` (fuera del repositorio) y carga cuatro secretos en GitHub: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`. La contraseña no pasa por el chat ni se guarda en ningún archivo.

**Respalda la llave y la contraseña en dos lugares distintos** (por ejemplo, tu gestor de contraseñas y un disco externo). Si se pierden, no se puede subir una versión nueva sin pedirle a Google que restablezca la llave.

Al crear la app en Play Console, acepta **Play App Signing**: Google guarda la llave de firma final y esta llave solo identifica tus subidas, así que perderla tiene arreglo.

## 2. Generar el archivo firmado

1. En GitHub: **Actions → Android → Run workflow** (rama `main`).
2. Cuando termine, descarga el artefacto **aab-firmado** (`app-release.aab`).
3. Súbelo en Play Console: **Pruebas → Pruebas internas → Crear versión**.

Cada ejecución usa su número de ejecución como `versionCode`, así que Google siempre ve una versión más nueva que la anterior. El APK `apk-telefono` del mismo flujo sirve para instalar en un teléfono y probar, pero va firmado con la llave de depuración y no sirve para Google Play.

## 3. Íconos y gráficos de la ficha

`apps/mobile/scripts/generar-iconos-android.py` genera los íconos de la app (adaptativo, redondo y de versiones anteriores) a partir del ícono de iOS, y deja en `apps/mobile/android/play-store/` el **ícono de 512 px** y el **gráfico destacado de 1024 × 500** para la ficha. Para regenerarlos: `python3 scripts/generar-iconos-android.py` desde `apps/mobile` (necesita Pillow).

## Lo que no se hace aquí

Las capturas de pantalla, los textos de la ficha y los formularios de Play se preparan en Play Console (ver el plan).
