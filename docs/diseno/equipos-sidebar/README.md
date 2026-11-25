# Equipos con sidebar (CYC-316)

Rediseño de la pestaña Equipos (CYC-308): la navegación dentro de la pestaña pasa a un sidebar. Maquetas en [propuestas.html](propuestas.html) y capturas en `capturas/`.

## Qué cambia respecto de CYC-308

| Antes (CYC-308) | Ahora |
|---|---|
| Pantalla de lista con tarjetas y pantalla de detalle aparte (`/equipos` y `/equipos/:id`) | Una sola pantalla: sidebar a la izquierda y detalle del equipo elegido a la derecha |
| «Crear equipo» en el encabezado de la lista | «Crear equipo» al pie del sidebar; el cuadro de creación es el mismo |
| Botón «Agregar rutina al equipo» | «Agregar rutina» (el equipo ya está elegido en el sidebar) |
| Botón «‹ Equipos» para volver a la lista | Ya no hace falta |

Todo lo demás del diseño aprobado se mantiene: cuadros de crear, agregar atletas, renombrar y eliminar, estados de los atletas y modelo de datos (`Team` y `TeamMember`). No hay cambio de modelo.

## Decisiones del diseño

1. **Sidebar simple**, como el ejemplo de la usuaria: encabezado «Equipos» con el botón que lo contrae, la lista de equipos (inicial con color, nombre y cantidad de atletas), el elegido en gris, y «Crear equipo» fijo al pie.
2. **Expandido y contraído.** Contraído es una columna angosta con la inicial de cada equipo, el botón de expandir arriba y «+» al pie; el nombre se ve al pasar el cursor. Se recuerda la última elección.
3. **Al entrar a Equipos se abre el primer equipo.** Sin equipos, el sidebar solo trae «Crear equipo» y el área principal muestra el estado vacío.
4. **Con muchos equipos** la lista se desplaza y «Crear equipo» queda fijo abajo.
5. **Equipo recién creado**: queda elegido y, sin atletas, muestra «Agregar atletas».
6. **Pantalla angosta**: el sidebar se pliega en un selector con el equipo actual.
7. **La barra superior no cambia**: Equipos sigue siendo una pestaña más.

## Para Desarrollo general

- Rutas: `/equipos` abre el primer equipo (o el estado vacío) y `/equipos/:id` el equipo elegido; el sidebar se arma con `GET /teams`, que ya trae nombre y cantidad.
- Afecta al PR #269 (CYC-310): `TeamsPage` pasa a ser el contenedor con el sidebar y `TeamDetailPage` su contenido. Los cuadros de crear, agregar, renombrar y eliminar no cambian.
- Sin cambios de API ni de base de datos.

## Preguntas abiertas

1. ¿«Crear equipo» al pie del sidebar? Propongo que sí.
2. ¿Al entrar se abre el primer equipo? Propongo que sí.
3. ¿El sidebar recuerda si quedó contraído o expandido? Propongo que sí.
