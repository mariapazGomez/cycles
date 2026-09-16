---
type: discovery
parent: "[[PRD-General]]"
status: open
created: 2026-09-16
updated: 2026-09-16
tags: [prd, discovery]
---

# Preguntas fundacionales — PRD General

> Cuestionario para solidificar [[PRD-General]] antes de empezar a implementar. 🔴 = bloqueante (afecta modelo de datos/arquitectura), 🟡 = importante pero no bloqueante.

## A. Visión y negocio

- [ ] ¿Es un proyecto solo tuyo, o hay equipo? ¿Uso propio, beta cerrada, o lanzamiento público?
- [ ] 🟡 ¿Buscas monetizarlo (SaaS por coach/atleta, B2B para gimnasios) o es portafolio/aprendizaje?
- [ ] 🟡 ¿Mercado geográfico inicial?
- [ ] 🔴 ¿Escala esperada el primer año? (10 coaches vs 10,000 — condiciona hosting/infra)
- [ ] 🟡 ¿Hay fecha objetivo de lanzamiento?

## B. Relación coach–atleta

- [ ] 🔴 ¿Un atleta puede tener ciclos activos de más de un coach a la vez, o solo uno?
- [ ] 🔴 Si termina la relación coach–atleta, ¿qué pasa con el historial y los ciclos?
- [ ] 🔴 ¿Un mismo usuario puede ser coach y atleta a la vez?
- [ ] 🔴 ¿Los atletas se auto-registran y luego se vinculan, o solo existen invitados por un coach?

## C. Alcance funcional del MVP

- [ ] 🔴 ¿Se necesitan plantillas/duplicar ciclos para reutilizar entre atletas?
- [ ] 🔴 ¿Biblioteca de ejercicios predefinida desde el día uno, o cada coach crea los suyos?
- [ ] 🟡 ¿Gráficas/métricas de progreso en el MVP o fase posterior?
- [ ] 🟡 ¿Comentarios de coach sobre una sesión del atleta (sin chat en tiempo real)?

## D. Autenticación y cuentas

- [ ] 🔴 Registro manual + login posterior con Google del mismo email: ¿se vinculan o se bloquea?
- [ ] 🟡 ¿Verificación de email obligatoria?
- [ ] 🟡 Sign in with Apple: ¿obligatorio en MVP o se puede postergar?

## E. Integraciones externas

- [ ] 🔴 ¿A qué APIs específicas se conectará la plataforma? (Google Fit/Apple Health/Strava, pasarela de pago, email transaccional, storage de video, etc.)
- [ ] 🟡 ¿Cuáles de esas integraciones son parte del MVP?

## F. No funcionales y cumplimiento

- [ ] 🟡 ¿Requisitos de privacidad específicos (GDPR u otra ley local) por manejar datos de desempeño físico?
- [ ] 🔴 ¿Unidades de medida fijas en kg, o configurables (kg/lb) por usuario?
- [ ] 🟡 ¿Español único o multi-idioma desde el inicio?

## G. Diseño e infraestructura

- [ ] 🟡 ¿Ya existe identidad visual (nombre definitivo, logo, colores)?
- [ ] 🟡 ¿Presupuesto/restricción de costo mensual de infraestructura?

---

Las respuestas de este cuestionario se incorporan a [[PRD-General]] (secciones 3, 4, 5, 8, 10, 11) y a [[PRD-Autenticacion]] donde corresponda.
