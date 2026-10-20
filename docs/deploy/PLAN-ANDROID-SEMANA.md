---
type: plan
parent: "[[ANDROID]]"
status: approved
tags: [deploy, android]
created: 2026-10-20
updated: 2026-10-20
---

# Plan para llevar Android a Google Play esta semana

> Semana del martes 20 al domingo 25 de octubre de 2026. Complementa [`../ANDROID.md`](../ANDROID.md) (las tarjetas A a G) con un calendario de siete días. **Aprobado por la fundadora el 2026-10-20.** El `applicationId` es `app.getcycles.mobile`. La cuenta de Play Console aún no está creada.

## Qué se puede lograr esta semana y qué no

**Sí:** dejar la app de Android compilada, firmada y en manos de testers en Google Play (prueba interna el jueves y prueba cerrada el viernes).

**No:** publicarla para todo el mundo. Google exige a las cuentas personales nuevas una **prueba cerrada con al menos 12 testers durante 14 días seguidos** antes de abrir producción (confirmar en Play Console: la política cambia, y las fuentes consultadas dicen que si bajan de 12 testers el conteo se reinicia). Una cuenta de organización estaría exenta, pero requiere una empresa registrada y no es nuestro caso.

| Hito | Fecha estimada |
|---|---|
| Cuenta de Play Console creada y verificada | Mar 20 a vie 23 (la verificación de identidad puede tardar más) |
| App compilada y firmada (AAB) | Mié 22 |
| Prueba interna disponible | Jue 22 o vie 23 |
| Prueba cerrada enviada con los 12 testers | Vie 23 |
| Empieza el conteo de 14 días | Cuando la prueba cerrada esté publicada y los 12 testers hayan aceptado (estimado sáb 24 o dom 25) |
| Solicitar producción | Desde el 8 o 9 de noviembre |
| Disponible para todos | Mediados de noviembre, después de la revisión de Google |

Esto adelanta casi dos meses el calendario anterior de Notion (diciembre a febrero).

## Lo que bloquea todo (hazlo hoy)

1. **Crear la cuenta de Google Play Console** (T-133): US$25, cuenta personal, verificación de identidad y de un teléfono Android real con la app de Play Console. Es lo único que no depende de Claude y no tiene plazo garantizado; si la verificación tarda, el resto de la semana se corre.
2. ~~Elegir el `applicationId`~~ (T-134): decidido, `app.getcycles.mobile`.
3. **Empezar a juntar los 12 testers** (T-141): el correo de Google de cada uno (el de Gmail con el que usan el teléfono). Al menos 3 del piloto usan Android; el resto, amigos o familia con Android sirven. Conviene pedir 15 para tener margen.

## Calendario

### Martes 20

| Quién | Qué | Tarea |
|---|---|---|
| Fundadora | Crear la cuenta de Play Console y pagar los US$25 | T-133 |
| Fundadora | Enviar la invitación a los testers (pedir su correo de Google) | T-141 |
| Claude | Adaptar el proyecto: `applicationId`, nombre «Cycles», permiso de vibración, URL de la API por entorno | T-136 |
| Claude | Flujo de GitHub Actions que compila el APK y comprueba que la app abre en un emulador | T-135 |

Criterio de «hecho»: el flujo corre verde y el emulador llega a la pantalla de inicio de sesión.

### Miércoles 21

| Quién | Qué | Tarea |
|---|---|---|
| Claude | Ícono adaptativo y pantalla de inicio con el isotipo; ícono de 512 px y gráfico destacado de 1024 × 500 | T-137 |
| Fundadora | Crear la llave de firma con un comando que Claude deja escrito, guardarla con respaldo y cargar sus datos como secretos de GitHub **sin pegarlos en el chat** | T-139 |
| Claude | Activar R8 y generar el AAB firmado en el flujo, como artefacto | T-140 |
| Fundadora | Aprobar el ícono | T-137 |

Criterio de «hecho»: hay un AAB firmado descargable. La llave de firma se guarda en dos lugares fuera del repositorio; si se pierde, no hay actualizaciones de la app.

### Jueves 22

| Quién | Qué | Tarea |
|---|---|---|
| Ambos | Recorrer la app en el emulador y en un teléfono Android: inicio de sesión, sesión guardada, Hoy, registro de series, pausa, cierre de sesión, Calendario, Resumen, «Olvidé mi contraseña», botón atrás y teclado | T-138 |
| Claude | Corregir lo que salga y volver a generar el AAB | T-138 |
| Fundadora | Subir el AAB a **prueba interna** en Play Console (ahí no hace falta revisión) | T-144 |
| Fundadora | Empezar los formularios de Play: seguridad de los datos, clasificación de contenido, público objetivo, anuncios y declaración de salud | T-142 |

Criterio de «hecho»: la app instalada desde Play (prueba interna) abre, inicia sesión con producción y completa una sesión.

### Viernes 23

| Quién | Qué | Tarea |
|---|---|---|
| Ambos | Ficha de la tienda: descripciones corta y larga, de 2 a 8 capturas (del emulador o de un teléfono) y el enlace a la política de privacidad | T-143 |
| Fundadora | Cuenta de prueba para que Google revise la app (ver riesgos) | T-120 |
| Fundadora | Terminar los formularios de Play | T-142 |
| Fundadora | Crear la **prueba cerrada**, cargar la lista de testers y enviar la versión a revisión | T-144 |

Criterio de «hecho»: la prueba cerrada queda enviada con la ficha y los formularios completos.

### Sábado 24 y domingo 25

- Los testers aceptan la invitación y la instalan. **Hay que llegar a 12 que sigan inscritos sin interrupción.**
- Claude revisa errores que reporten y prepara una versión corregida si hace falta.
- El conteo de 14 días empieza cuando la prueba cerrada esté publicada y los 12 hayan aceptado.

### Después de la semana

- **Días 1 a 14:** seguimiento diario de testers y errores; si algo exige una versión nueva, se sube a la misma prueba sin reiniciar el conteo (confirmar en Play Console).
- **Desde el 8 o 9 de noviembre:** solicitar el acceso a producción, enviar a revisión y lanzar de forma escalonada (10 %, luego 100 %) (T-145).

## Riesgos que pueden mover las fechas

| Riesgo | Efecto | Qué hacer |
|---|---|---|
| La verificación de identidad de Google tarda | Todo se corre el mismo número de días | Hacer hoy el paso de la cuenta; revisar el correo de Google cada día |
| No llegan 12 testers a tiempo | El conteo no empieza | Pedir 15 para tener margen; empezar hoy |
| La primera versión de la prueba cerrada demora en revisarse | El conteo empieza más tarde | Enviarla el viernes como muy tarde |
| Primera compilación de Android con React Native 0.87 falla por alguna dependencia | Se corre un día | Es lo que mide T-135 hoy; si falla, se sabe esta tarde |
| **Cuenta de prueba para Google (T-120, en pausa)** | Google no puede revisar la app sin credenciales | Retomar T-120 el viernes como muy tarde; es la misma cuenta de demostración de Apple |
| **Formulario de seguridad de datos y eliminación de cuenta** | Google puede pedir cómo se pide eliminar la cuenta; hoy no hay función para eso (T-150 está en marzo de 2027) | Declarar la solicitud por correo a `privacidad@getcycles.app` (T-148) y confirmar en Play Console qué exige hoy; si exige más, es una tarjeta nueva |
| **Política de privacidad pública** | La ficha exige una URL | Confirmar que la política esté publicada en una URL pública de `getcycles.app` y cerrar T-146 antes del viernes |

## Qué queda fuera de esta semana

- Notificaciones push en Android (T-156 y su equivalente): los avisos siguen siendo por la campana dentro de la app.
- La versión del coach en la app móvil (T-173): se lanza primero la del atleta.
- Cualquier cambio de diseño: solo lo necesario para que funcione en Android.
