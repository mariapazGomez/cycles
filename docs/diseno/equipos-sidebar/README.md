# Equipos con sidebar (CYC-316)

Rediseño de la pestaña Equipos (CYC-308): la navegación dentro de la pestaña pasa a un sidebar. Maquetas en [propuestas.html](propuestas.html) y capturas en `capturas/`.

## Qué cambia respecto de CYC-308

| Antes (CYC-308) | Ahora |
|---|---|
| Pantalla de lista con tarjetas y pantalla de detalle aparte (`/equipos` y `/equipos/:id`) | Una sola pantalla: sidebar a la izquierda y detalle del equipo elegido a la derecha |
| «Crear equipo» en el encabezado de la lista | «Crear equipo» arriba del sidebar; el cuadro de creación es el mismo |
| Botón «Agregar rutina al equipo» | «Agregar rutina» (el equipo ya está elegido en el sidebar) |
| Botón «‹ Equipos» para volver a la lista | Ya no hace falta |

Todo lo demás del diseño aprobado se mantiene: cuadros de crear, agregar atletas, renombrar y eliminar, estados de los atletas y modelo de datos (`Team` y `TeamMember`). No hay cambio de modelo.

## Decisiones del diseño

1. **Sidebar de 260 px** dentro de la pestaña, con «Crear equipo» arriba y la lista de equipos debajo. Cada equipo muestra su inicial con color, su nombre y cuántos atletas tiene. El elegido se resalta.
2. **Al entrar a Equipos se abre el primer equipo.** Sin equipos, el sidebar solo trae «Crear equipo» y el área principal muestra el estado vacío.
3. **Con muchos equipos** (más de 7) aparece un buscador y la lista se desplaza sola.
4. **Equipo recién creado**: queda elegido y, si no tiene atletas, muestra «Este equipo aún no tiene atletas» con «Agregar atletas».
5. **Pantalla angosta** (web en celular o ventana pequeña): el sidebar se pliega en un selector con el equipo actual; al abrirlo muestra «Crear equipo» y la lista.
6. **La barra superior no cambia**: Equipos sigue siendo una pestaña más y el sidebar vive dentro de ella.

## Para Desarrollo general

- Rutas: `/equipos` abre el primer equipo (o el estado vacío) y `/equipos/:id` el equipo elegido; el sidebar se arma con `GET /teams`, que ya trae nombre y cantidad.
- Afecta al PR #269 (CYC-310): `TeamsPage` pasa a ser el contenedor con el sidebar y `TeamDetailPage` su contenido. Los cuadros de crear, agregar, renombrar y eliminar no cambian.
- Sin cambios de API ni de base de datos.

## Preguntas abiertas

1. ¿«Crear equipo» arriba del sidebar, en vez de en el encabezado? Propongo que sí.
2. ¿Al entrar se abre el primer equipo? Propongo que sí.
3. ¿El buscador aparece con más de 7 equipos? Propongo ese umbral.
