---
type: guide
status: active
created: 2026-10-09
---

# Publicar la app iOS: versión, compilación y validador

Reglas para subir una compilación a App Store Connect (TestFlight o tienda) sin que Apple la rechace. Los comandos se corren en `apps/mobile`.

## Los dos números

| | Dónde vive | Quién lo ve | Regla |
|---|---|---|---|
| **Versión** (`MARKETING_VERSION`) | Proyecto de Xcode | Los usuarios | Formato `X.Y.Z`. Se sube a mano cuando hay algo nuevo (`1.0.1` arreglos, `1.1.0` novedades). |
| **Compilación** (`CURRENT_PROJECT_VERSION`) | Proyecto de Xcode | Tú y Apple | Un contador que **nunca baja ni se repite**, aunque cambie la versión. Apple rechaza una compilación igual o menor a una ya subida. |

La última subida está anotada en `apps/mobile/ios/subidas.json`.

## Orden de una subida

1. Estar en `main`, al día y sin cambios sin commitear.
2. `npm run ios:bump`: deja la compilación en un número que Apple aceptará (la última subida + 1). Con `npm run ios:bump -- --version 1.1.0` también cambia la versión visible.
3. `npm run ios:check`: el validador (ver abajo). Si falla, no subir.
4. Archivar y subir (Xcode: Product → Archive → Distribute App → App Store Connect).
5. `npm run ios:registrar`: anota la subida en `subidas.json`. Commitear ese archivo.

Si olvidas el paso 2, el paso 3 falla y te lo dice. Si olvidas el paso 5, la siguiente subida podría repetir el número: no te saltes ese paso.

## Qué valida `ios:check`

- La versión es `X.Y.Z` y la compilación es mayor que la última subida.
- El identificador es `app.getcycles.mobile` y el equipo de firma **no** es el gratuito.
- Solo iPhone, cifrado declarado en el `Info.plist` y ningún permiso con el texto vacío.
- Ícono de 1024 × 1024 **sin transparencia** (Apple lo rechaza si tiene).
- Las compilaciones Release usan la API de producción.
- Sin cambios sin commitear y al día con `origin/main`.
- `tsc` y todos los tests (se omiten con `--sin-pruebas`).

## Se ejecuta solo al archivar

El proyecto de Xcode tiene una fase "Validar la subida a App Store Connect" que corre `ios:check --desde-xcode` **solo al archivar en Release**. Si falla, el archivado se detiene con un error. Las compilaciones de prueba (simulador, Debug, o Release directo al iPhone) no se validan. Dentro de Xcode no corre `tsc` ni los tests (ya se corren a mano en el paso 3).

La fase llama a `scripts/ios-check-xcode.sh` y no directamente a Node porque `with-environment.sh` de React Native solo ejecuta **un comando sin argumentos**; con argumentos se saltaba en silencio. Si cambias esa fase, vuelve a probar que archivar falla cuando debe.

## Lo que el validador no puede saber

No consulta a Apple: si alguien subió una compilación desde otro Mac sin registrarla, `subidas.json` no lo sabrá. Para eso haría falta una clave de la API de App Store Connect.
