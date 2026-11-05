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

## 2 bis. Entrar con Google en Android (CYC-220)

El botón «Continuar con Google» sale en Android solo si la compilación trae un **ID de cliente de Google de tipo Android**. Google emite un ID **por huella SHA-1 de la llave de firma**, y hay dos firmas distintas, así que se crean **dos IDs**:

| Para qué | Firma | Huella SHA-1 | Secreto de GitHub |
|---|---|---|---|
| APK de pruebas (`apk-telefono`, instalación manual) | Llave de depuración del repositorio | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (pública: `apps/mobile/android/app/debug.keystore`) | `GOOGLE_ANDROID_DEBUG_CLIENT_ID` |
| App que baja de Google Play (prueba interna y producción) | La que usa **Google Play** (Play App Signing) | Play Console → tu app → **Configuración → Integridad de la app → Firma de apps → «Certificado de la clave de firma de la app»** (existe solo después de subir el primer AAB) | `GOOGLE_ANDROID_CLIENT_ID` |

Pasos (los de consola son tuyos):

1. **Google Cloud** → el proyecto de Cycles → APIs y servicios → Credenciales → **Crear credenciales → ID de cliente de OAuth → Android**. Nombre del paquete `app.getcycles.mobile` y la huella SHA-1 de la fila que toque. Repite para la otra firma. (La pantalla de consentimiento es la misma que la de iOS.)
2. **GitHub** → Settings → Secrets and variables → Actions: crea los secretos de la tabla con el ID (`<número>-<código>.apps.googleusercontent.com`). Nunca en el repositorio, en Linear ni en el chat.
3. **Render**: variable `GOOGLE_ANDROID_CLIENT_ID` con **los dos IDs separados por coma**. La API los acepta como audiencia del token.
4. **Compilar de nuevo** (Actions → Android → Run workflow, rama `main`). Si falta un secreto, esa compilación sale sin el botón de Google (no falla).

Cómo funciona: `apps/mobile/scripts/write-google-config.js` escribe el ID en `src/config/google.ts`, y `build.gradle` registra el esquema `com.googleusercontent.apps.<número>-<código>` en el manifiesto con la misma variable. La app abre Chrome Custom Tabs con `react-native-app-auth` (código con PKCE y nonce) y manda `{ idToken, nonce }` a `POST /auth/google/token`, igual que iOS.

## 2 ter. Dejarla disponible en Google Play (prueba interna)

Lo hace la fundadora en Play Console; Claude solo genera el AAB.

1. Generar el AAB desde `main` (sección 2). **No subir** el que salga de una rama de pruebas.
2. Play Console → **Pruebas → Pruebas internas → Crear versión**, aceptar **Play App Signing** y subir `app-release.aab`.
3. Crear la lista de testers (correos de Google) y copiar el **enlace de participación**: quien lo abra con esa cuenta instala la app desde Play, sin archivos sueltos.
4. Completar lo que Play pida antes de la primera versión: ficha, **declaración de privacidad** (datos de diagnóstico por Sentry) y la **cuenta de demostración** para la revisión (la misma de Apple, CYC-50). La prueba interna no pasa por revisión; la cerrada y la producción sí.
5. Con el AAB ya subido, copiar la huella de «Firma de apps» (sección 2 bis), crear su ID de cliente y volver a generar el AAB: la primera versión sale **sin** botón de Google.

## 3. Íconos y gráficos de la ficha

`apps/mobile/scripts/generar-iconos-android.py` genera los íconos de la app (adaptativo, redondo y de versiones anteriores) a partir del ícono de iOS, y deja en `apps/mobile/android/play-store/` el **ícono de 512 px** y el **gráfico destacado de 1024 × 500** para la ficha. Para regenerarlos: `python3 scripts/generar-iconos-android.py` desde `apps/mobile` (necesita Pillow).

## Lo que no se hace aquí

Las capturas de pantalla, los textos de la ficha y los formularios de Play se preparan en Play Console (ver el plan).
