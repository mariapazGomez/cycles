# Reglas de trabajo con Linear (team Cyclesapp, clave CYC)

Aplican a toda sesión de código que ejecute tareas. Responde siempre en español latino neutro, tuteando.

## Estados

- **In Progress**: la tarea está planeada para hoy. Lo marca el chat de planificación, no las sesiones de código.
- **En desarrollo**: una sesión la está construyendo ahora mismo. Evita que dos chats tomen la misma tarea.
- **In Review**: hay un PR abierto esperando revisión.
- **Done**: el PR se mezcló.
- **Pausado**: la usuaria la detuvo a propósito. No la toques.

## Antes de empezar una tarea

1. Lee la tarjeta en Linear. Si está **En desarrollo** o tiene el comentario de reclamo de otra sesión, no la tomes: elige la siguiente.
2. Si está libre, pásala a **En desarrollo** y deja un comentario: `Reclamada por la sesión «<título de la sesión>» el <fecha> a las <hora>`.
3. Vuelve a leer la tarjeta y confirma que el reclamo es el tuyo. Linear no bloquea de forma atómica; si dos comentarios llegaron casi a la vez, gana el primero.
4. Toma solo tareas con tu etiqueta de agente (grupo **Agente**) y en In Progress.

## Agentes

- **Desarrollo general** (sesión «Desarrollos generales del proyecto»): API, web y lo que toque a ambas.
- **App móvil** (sesión «Diseño de app móvil»): cambios en la app iOS/Android.
- **Agente de diseño** (sesión «Agente de diseño»): todo diseño (UX/UI, marca, maquetas, capturas) pasa por él antes de desarrollar. Tiene cargadas las skills de diseño de la marca y las herramientas de UX y UI. Las sesiones de desarrollo no diseñan: esperan a que su tarjeta de diseño esté en Done (las tarjetas de desarrollo quedan bloqueadas por la de diseño).
- El chat de planificación solo organiza: no ejecuta tareas.
- Si una tarea toca web y móvil, se divide en subtareas, una por agente. Si te quedas sin tareas, avisa en vez de tomar las del otro agente.

## Parte siempre de lo último en `origin/main`

Antes de diseñar o desarrollar, ejecuta `git fetch origin` y trabaja sobre `origin/main` (en una rama o worktree nueva desde `origin/main`). La carpeta principal del repo puede estar en una rama vieja y varios commits atrás. Lo que diseñes o construyas se contrasta con el código de `origin/main`, no con lo que haya en el disco. Si tu rama no parte de `origin/main`, haz rebase antes del PR para no pisar cambios recientes.

## Al terminar o detenerte

- Con PR abierto: pasa la tarjeta a **In Review** y enlaza el PR.
- PR mezclado: **Done**.
- Si te detienes sin terminar: devuelve la tarjeta a **In Progress** y comenta qué quedó hecho.

## Seguridad

Nunca escribas contraseñas, tokens ni claves en Linear, en comentarios ni en el repo.
