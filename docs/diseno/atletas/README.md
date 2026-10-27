---
type: design
parent: "[[PRD-InvitacionAtletas]]"
status: implemented
tags: [diseno, atletas, coach]
created: 2026-10-27
updated: 2026-10-27
---

# Pestaña Atletas

> Implementada en la web (2026-10-27), sin maqueta previa: parte del lenguaje de [[ciclo-en-calendario]] (tarjetas elevadas, check verde, esqueletos de carga).

## Qué cambió

Antes la pestaña era un formulario de invitación y, debajo, una lista de nombre, email y estado. Ahora es una vista de **una tarjeta por atleta**:

- **Tarjeta:** avatar, nombre (lleva al resumen), email y estado (Con avisos, Al día, Sin ciclo, Invitación pendiente).
- **Avisos:** el motivo ("Dolor reportado", "Carga alta") bajo el nombre y un filo de color a la izquierda. Al tocarlo se va al resumen del atleta, donde están las acciones.
- **Ciclo:** el nombre del ciclo activo (lleva al ciclo) y "Semana 3 de 5".
- **Semana:** siete casillas, de lunes a domingo, con una marca por sesión (check verde si está hecha, X si se omitió, círculo si está pendiente) y el día de hoy resaltado.
- **Avance:** barra con las sesiones completadas de las asignadas en las últimas 4 semanas.
- **Acciones:** Ver resumen, Ver ciclo y, si no tiene ciclo, Crear ciclo.
- **Invitación pendiente:** lo dice y recuerda que el enlace vence a los 7 días.
- **Orden:** los que tienen avisos primero, como en el Inicio.

## Filtros y búsqueda

- Filtros por **Todos**, **Con avisos**, **Sin ciclo** y **Pendientes**, cada uno con su conteo; solo aparecen los que tienen atletas.
- Búsqueda por nombre o email, sin importar mayúsculas ni tildes.

## Invitar

- El botón **Invitar atleta** abre el formulario sobre la lista y le da el foco al nombre. Se cierra con el mismo botón.
- Sin atletas, el formulario aparece abierto con el título "Invita a tu primer atleta".
- Las validaciones y los mensajes son los de antes.

## Datos

No hay cambios en la API. La pestaña usa los mismos datos que el Inicio del coach (atletas, ciclos, avisos y las sesiones de la semana, con el gancho `useCoachRoster`) más el resumen de cada atleta de las últimas 4 semanas (`GET /athletes/:id/summary?weeks=4`).

## Pendiente

- La lista de atletas no trae la fecha de invitación, así que la tarjeta pendiente no dice cuándo se envió ni permite reenviarla. Haría falta ampliar `GET /athletes` y un endpoint de reenvío.
- Con muchos atletas (50 o más) falta paginar.
- La barra de avance cuenta las sesiones asignadas de las últimas 4 semanas, incluidas las que aún no llegan de la semana en curso.
