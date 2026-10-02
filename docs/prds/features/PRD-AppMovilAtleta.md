---
type: prd
level: feature
parent: "[[PRD-General]]"
status: draft
phase: "Fase 3 — Ejecución y seguimiento"
created: 2026-09-25
updated: 2026-09-25
tags: [prd, feature/app-movil-atleta]
related: ["[[PRD-EjecucionYSeguimiento]]", "[[PRD-RutinasYProgramacion]]"]
---

# PRD — App móvil del atleta (iOS)

> Hijo de [[PRD-General]]. Adelanta parte de "Fase 4 — Evolución" (app móvil nativa, ver roadmap del PRD general) porque el registro de ejecución ([[PRD-EjecucionYSeguimiento]]) es mobile-first por diseño: el atleta registra durante el entrenamiento, en el gimnasio, con el celular en la mano.

## 1. Resumen

App nativa iOS (React Native, CLI bare — no Expo) para que el atleta vea la sesión que le toca y registre su ejecución serie por serie, siguiendo el flujo ya especificado en [[PRD-EjecucionYSeguimiento]]. No incluye nada del lado del coach (eso sigue siendo web).

## 2. Por qué un proyecto separado del monorepo web

`apps/mobile` vive en el mismo repo/monorepo (reutiliza `@cycles/shared` para los tipos de dominio), pero es un proyecto nativo independiente de `apps/web` — no comparte código de UI ni build. Se desarrolla en un git worktree aparte (`worktree-mobile-app`) para no interferir con el trabajo en curso del backend de Fase 3 (rama `feat/fase-3-backend`, con cambios sin commitear en el checkout principal).

## 3. Alcance

### Dentro de alcance (primera iteración)

- Setup del proyecto: React Native CLI bare, TypeScript, iOS únicamente por ahora (Android queda para después).
- Login (reusa `POST /auth/login` — mismo backend que la web).
- Pantalla "Hoy": la sesión pendiente del plan activo (`GET /me/today`, ver [[PRD-EjecucionYSeguimiento]] sección 6).
- Registro serie por serie con RIR, cierre de sesión con sRPE/duración/dolor/nota — mismo flujo y reglas que ya especificó [[PRD-EjecucionYSeguimiento]] sección 7.1.

### Fuera de alcance

- Todo lo de coach (queda en la web).
- Android (se evalúa después de validar iOS).
- Cualquier funcionalidad de Fase 4 (notificaciones push, wearables) — ver roadmap del PRD general.
- Modo offline completo — solo tolerancia a reintentos (ya especificada en el PRD de ejecución).

## 4. Dependencias

- **Bloqueante real**: el backend de [[PRD-EjecucionYSeguimiento]] (`GET /me/today`, `POST /sessions/:id/start`, `POST /session-exercises/:id/logs`, `POST /sessions/:id/feedback`) está en desarrollo en la rama `feat/fase-3-backend`, todavía no mergeado a `main`. La UI de esta app se puede construir en paralelo contra esa especificación, pero no se puede probar contra la API real hasta que ese backend esté mergeado.
- Depende de la autenticación ya existente (`PRD-Autenticacion`) — mismo login que la web.

## 5. Estado

- 2026-09-25: proyecto scaffoldeado (`@react-native-community/cli`, RN 0.87.1 + TypeScript), integrado al workspace del monorepo (`@cycles/mobile`, dependencia de `@cycles/shared`), CocoaPods instalado, build verificado corriendo en el simulador de iPhone 16.
- Pendiente: navegación, pantallas de login/hoy/registro, wiring de auth y API contra el backend (bloqueado por Fase 3, ver sección 4).
- Decisión abierta: ¿la UI reusa la identidad de `docs/brand/identidad-visual.md`, o la app nativa tiene su propio lenguaje visual dado que es una experiencia táctil distinta?
