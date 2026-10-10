# Lanzamiento en Android

Lista de tareas para publicar Cycles en Google Play, con sus dependencias. Pensada para pasarla a un tablero kanban.

Tamaños: S (menos de 2 h), M (medio día), L (1 día o más). "Bloqueada por" indica qué tarjetas deben estar hechas antes.

## Contexto

- La app móvil es React Native CLI (no Expo) y ya tiene la carpeta `apps/mobile/android/`.
- Hoy `applicationId` es `com.cyclesmobile` y el release se firma con `debug.keystore` (`apps/mobile/android/app/build.gradle`).
- Costo: US$25 de Google Play Console, pago único. Estimado de trabajo: 2 a 4 días, más 14 días de prueba cerrada.
- Requisito de Google para cuentas personales nuevas: prueba cerrada con al menos 12 testers durante 14 días antes de pasar a producción. Confirmar en Play Console, porque la política cambia.

## Tarjetas

### A. Preparación (sin código)

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| A1 | Crear cuenta de Google Play Console (US$25 y verificación de identidad) | S | — |
| A2 | Decidir el `applicationId` definitivo (no se puede cambiar después de publicar) | S | — |
| A3 | Instalar Android Studio, SDK y emulador | M | — |
| A4 | Publicar la política de privacidad en una URL pública | M | — |
| A5 | Redactar descripción corta y larga de la ficha | M | — |
| A6 | Diseñar ícono adaptativo, splash, ícono 512 y gráfico destacado 1024×500 | M | — |

### B. Build base

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| B1 | Compilar y correr la app en el emulador sin cambios | M | A3 |
| B2 | Cambiar `applicationId`, `namespace` y nombre visible a "Cycles" | S | A2, B1 |
| B3 | Configurar la URL de la API por entorno (emulador `10.0.2.2`, release a producción por HTTPS) | S | B1 |
| B4 | Integrar ícono y splash en el proyecto Android | S | A6, B2 |

### C. Adaptación a Android

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| C1 | Probar login, registro y refresh de token, revisando `tokenStore.ts` (pensado para el Keychain de iOS) | M | B3 |
| C2 | Revisar "olvidé mi contraseña" y `Linking.openURL` | S | B3 |
| C3 | Adaptar la isla flotante de pestañas (`elevation`, gestos, safe areas) | M | B1 |
| C4 | Revisar barra de estado, botón atrás y teclado en formularios | M | B1 |
| C5 | Recorrer cada pantalla (Hoy, registro, feedback, Resumen) y corregir fallos | M | C1, C3, C4 |
| C6 | Revisar tipografías, SVG y colores en distintos tamaños de pantalla | M | C3 |
| C7 | Verificar que `jest` y `typecheck` pasen | S | C5 |

### D. Firma y release

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| D1 | Crear el keystore de release y guardarlo con respaldo fuera del repo (si se pierde, no hay actualizaciones) | S | — |
| D2 | Configurar la firma release en Gradle (contraseñas fuera de git) | S | B2, D1 |
| D3 | Activar R8/ProGuard y verificar que el release funciona | M | C5, D2 |
| D4 | Generar el AAB firmado (`./gradlew bundleRelease`) | S | D3, B4 |

### E. Ficha y requisitos de la tienda

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| E1 | Tomar capturas de pantalla (2 a 8) | M | C5 |
| E2 | Completar el formulario "Seguridad de los datos" | M | A4, C5 |
| E3 | Definir y habilitar la eliminación de cuenta, con enlace web (Google lo exige) | M | A4 |
| E4 | Completar clasificación de contenido, público objetivo y categoría "Salud" | S | A1 |
| E5 | Armar la ficha de la tienda (textos, imágenes, política) | M | A1, A4, A5, A6, E1 |

### F. Pruebas y publicación

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| F1 | Subir el AAB a prueba interna y probar en dispositivos reales | S | A1, D4, E5 |
| F2 | Reclutar al menos 12 testers (conviene empezar antes) | M | — |
| F3 | Pasar a prueba cerrada con los testers | S | F1, F2, E2, E3, E4 |
| F4 | Mantener la prueba cerrada 14 días seguidos | L (calendario) | F3 |
| F5 | Corregir lo que reporten los testers (en paralelo a F4) | M | F3 |
| F6 | Solicitar acceso a producción y enviar a revisión | S | F4, F5 |
| F7 | Lanzamiento escalonado (10% y luego 100%) | S | F6 |

### G. Cierre

| ID | Tarea | Tamaño | Bloqueada por |
|---|---|---|---|
| G1 | Documentar el proceso de release en `docs/deploy/` | S | F7 |
| G2 | Agregar casos de prueba de Android en `docs/PRUEBAS-PENDIENTES.md` | S | C5 |
| G3 | Decidir qué hacer con notificaciones push (FCM) | S | — |

## Cómo leer el plan

**Sin bloqueos, listas desde el día 1:** A1, A2, A3, A4, A5, A6, D1, F2, G3.

**Ruta crítica** (define cuándo se publica):

`A3 → B1 → C3/C4 → C5 → D3 → D4 → F1 → F3 → F4 (14 días) → F6 → F7`

**Cuellos de botella:**
- **C5** (recorrido completo) bloquea D3, E1, E2, C7 y G2.
- **A1** (Play Console) bloquea E4, E5 y F1. La verificación puede tardar días: hacerla primero.

**Paralelizable mientras se espera:** A4, A5, A6 y F2 no dependen del código. E3 puede avanzar en el backend por su cuenta.

## Preguntas abiertas

1. **E3 (eliminar cuenta):** ¿ya existe en la API y la web? Si no, es una tarjeta mayor y bloquea F3.
2. **F2 (testers):** si las participantes del piloto usan iPhone, hacen falta otras personas con Android. Es el mayor riesgo de calendario.
