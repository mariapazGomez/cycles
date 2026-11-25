# Equipos con sidebar (CYC-316)

Rediseño de la pestaña Equipos (CYC-308): la navegación dentro de la pestaña pasa a un sidebar con un selector de equipo y tres herramientas. Maquetas en [propuestas.html](propuestas.html) y capturas en `capturas/`.

## Lo que pidió la usuaria

- Un sidebar simple, expandido y contraído (como el ejemplo que compartió).
- Un **selector desplegable** para elegir el equipo con el que se trabaja, y no un campo por equipo.
- Debajo, las herramientas del equipo: **Calendario, Ciclos y Rankings**.
- Sin negritas pesadas.

## Qué cambia respecto de CYC-308

| Antes (CYC-308) | Ahora |
|---|---|
| Lista de tarjetas de equipos y detalle aparte | Selector de equipo en el sidebar; no hay pantalla de lista |
| Detalle con la tabla de atletas | Tres herramientas: Calendario, Ciclos y Rankings |
| «Agregar atletas», «Quitar», Renombrar y Eliminar en el detalle | Salen del botón «12 atletas» y del menú ⋯ del encabezado |
| «Crear equipo» en la lista | «Crear equipo» al pie del selector desplegable |
| Textos en negrita pesada | Peso normal y medio en el sidebar, los títulos y las tablas |

El modelo de datos (`Team` y `TeamMember`) y los cuadros de crear, agregar, renombrar y eliminar no cambian.

## Decisiones del diseño

1. **Sidebar** con, de arriba abajo: botón para contraer, selector del equipo (inicial con color, nombre y una flecha) y la lista «Herramientas» con ícono y nombre. La herramienta activa va en gris.
2. **Selector desplegable**: lista los equipos con su cantidad de atletas, el actual en gris, y «Crear equipo» al final.
3. **Contraído**: columna angosta con la inicial del equipo y los tres íconos; el nombre se ve al pasar el cursor.
4. **Calendario** (vista inicial): la semana de cada atleta del equipo, con una marca por día (hecha, omitida, pendiente, hoy), cambio de semana y «Agregar rutina».
5. **Ciclos**: el ciclo vigente de cada atleta, la semana en que va y su avance; «Agregar ciclo».
6. **Rankings**: atletas ordenados por el porcentaje de sesiones completadas sobre las asignadas, con selector de período (últimas 4 semanas o este ciclo).
7. **Atletas del equipo**: el botón «12 atletas» abre un cuadro con la lista, «Quitar» y «Agregar atletas». El menú ⋯ trae Renombrar y Eliminar equipo.
8. **Sin equipos**: el selector dice «Sin equipos», las herramientas aparecen apagadas y el centro invita a crear el primero.
9. **Pantalla angosta**: el selector queda arriba y las herramientas pasan a pestañas.

## Para Desarrollo general

- Rutas: `/equipos` abre el primer equipo en Calendario; `/equipos/:id/calendario`, `/ciclos` y `/rankings` para cada herramienta.
- Afecta al PR #269 (CYC-310): `TeamsPage` y `TeamDetailPage` se reemplazan por un contenedor con el sidebar y las tres vistas.
- Calendario reutiliza el cálculo de la semana de Atletas; Ciclos, el ciclo vigente que ya trae el detalle del equipo; Rankings usa el mismo dato de cumplimiento de la tarjeta del atleta (últimas 4 semanas), calculado por equipo.
- Sin cambios de modelo. Rankings puede necesitar un endpoint de lectura por equipo, a definir con Desarrollo general.

## Preguntas abiertas

1. ¿Calendario, Ciclos y Rankings muestran lo descrito arriba? Es mi interpretación.
2. ¿Agregar y quitar atletas, renombrar y eliminar salen del botón «12 atletas» y del menú ⋯? Propongo que sí.
3. ¿El ranking es solo por sesiones completadas, o hay otro criterio? Propongo empezar solo con ese.
4. ¿El sidebar recuerda si quedó contraído o expandido? Propongo que sí.
