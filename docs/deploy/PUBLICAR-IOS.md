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
- El identificador es `app.getcycles.mobile` y el equipo de firma es `Y6Z96XJBFW` (la cuenta de Apple Developer, inscrita como persona física). Ese ID es el mismo que tenía el equipo personal gratuito: al pagar el programa el ID se conserva. Por eso el validador, además, avisa si **Xcode todavía ve el equipo como gratuito** (hay que actualizar la cuenta en Xcode → Settings → Accounts).
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

## Compilar y subir con Xcode Cloud

**Por qué.** Desde 2026 Apple solo acepta compilaciones hechas con el **SDK de iOS 26 (Xcode 26 o más nuevo)**. El Mac de la fundadora (macOS 14.5, Xcode 16.2, disco casi lleno) no puede instalarlo, así que la compilación se hace en **Xcode Cloud**, los servidores de Apple. La firma y los certificados de distribución los administra Apple.

**Qué hay en el repositorio**
- `apps/mobile/ios/ci_scripts/ci_post_clone.sh`: Xcode Cloud lo ejecuta tras clonar. Instala Node 22 si falta, las dependencias de npm **solo de la app móvil y del paquete compartido** (`npm ci --workspace apps/mobile --workspace packages/shared`), CocoaPods y los pods. Fija UTF-8 (CocoaPods se cae sin eso) y le indica a las fases de compilación dónde está Node (`.xcode.env.local`). El nombre del archivo y su carpeta (junto al proyecto de Xcode) tienen que ser exactamente esos.
- El **validador** detecta Xcode Cloud (`CI_XCODE_CLOUD=TRUE`) y omite dos comprobaciones que ahí no aplican: git limpio y al día con `main` (es un clon en un commit concreto) y la comparación del número de compilación con `subidas.json` (lo numera Xcode Cloud). Todo lo demás se valida igual: versión, identificador, equipo, solo iPhone, cifrado, permisos, ícono y API de producción.
- Se probó simulando un Mac limpio: clon nuevo, sin `node_modules` ni `LANG`, con el script entero. Eso encontró el fallo de la codificación de CocoaPods.

**Configurar el flujo (una sola vez, en Xcode, lo hace la dueña de la cuenta)**
1. Abrir `apps/mobile/ios/CyclesMobile.xcworkspace` en Xcode.
2. Panel de informes (⌘9) → pestaña **Cloud** → **Get Started** / crear flujo.
3. Conceder acceso al repositorio de GitHub (Xcode Cloud instala su app en GitHub).
4. Entorno: **Xcode: "Latest Release"** y macOS el más reciente. Esto es lo que resuelve el requisito del SDK.
5. Condición de inicio: **manual** al principio (cada compilación gasta horas del plan gratuito, 25 al mes).
6. Acción: **Archive – iOS**, y como preparación del despliegue **TestFlight (solo pruebas internas)**.

**Número de compilación.** Con Xcode Cloud lo numera Apple (empieza en 1, configurable en App Store Connect). Por eso `ios:bump` y `ios:registrar` solo valen para subidas hechas desde un Mac propio; con Xcode Cloud se deja de usar `subidas.json`.

**Lo que no se pudo comprobar antes de la primera compilación real:** que Xcode Cloud acepte el flujo con el proyecto dentro de un monorepo, y el tiempo de `npm ci` y `pod install` en sus servidores. Si la primera compilación falla, el registro está en Xcode (⌘9 → Cloud) y en App Store Connect → Xcode Cloud.
