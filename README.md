# Cycles

Plataforma para que entrenadores (coaches) diseñen y asignen planificaciones de entrenamiento a sus atletas, y estos registren su ejecución (series, RIR, feedback de sesión). El coach trabaja desde la web; el atleta, desde una app nativa iOS.

- Producto: ver [`docs/prds/PRD-General.md`](./docs/prds/PRD-General.md) — PRD padre de un sistema de PRDs enlazados (uno por funcionalidad, ver [`docs/prds/README.md`](./docs/prds/README.md)). Pensado para navegarse con [Obsidian](https://obsidian.md) abriendo `docs/` o `docs/prds/` como vault.
- Arquitectura técnica: ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Deuda técnica conocida: ver [`docs/DEUDA-TECNICA.md`](./docs/DEUDA-TECNICA.md)
- Índice rápido de rutas/documentos: ver [`docs/enlaces.md`](./docs/enlaces.md)

## Estructura del proyecto

```
cycles/
├── apps/
│   ├── web/     # Frontend del coach — React + TypeScript + Vite
│   ├── api/     # Backend — NestJS + TypeScript + Prisma
│   └── mobile/  # App del atleta — React Native (CLI bare), iOS
├── packages/
│   └── shared/  # Tipos/DTOs compartidos entre web, api y mobile
└── docs/        # PRDs y documentación de arquitectura
```

## Stack

- **Frontend web (coach):** React, TypeScript, Vite, CSS Modules.
- **App móvil (atleta):** React Native (CLI bare, sin Expo), TypeScript, iOS. Android no está implementado todavía.
- **Backend:** Node.js, TypeScript, NestJS, Prisma ORM.
- **Base de datos:** PostgreSQL.
- **Autenticación:** Google OAuth, registro manual (email/contraseña) con JWT (access + refresh con rotación y detección de reuso).

## Estado actual

- **Autenticación:** completa en la web (login, registro, verificación de email, reset de contraseña, Google OAuth, completar perfil).
- **Planificación (coach, web):** catálogo de ejercicios, biblioteca de rutinas reutilizables, y programación en grid sobre ciclos de entrenamiento (micro/meso/macrociclo), con progresión por celda.
- **Ejecución y seguimiento (atleta):** backend completo — registro de series con RIR (append-only, con corrección vía `supersedesId`), cierre de sesión con sRPE/dolor/notas. La app móvil iOS ya tiene el flujo funcionando de punta a punta (login → "Hoy" → registro de series → cierre de sesión) contra este backend. El frontend web equivalente (para que el coach vea el progreso de sus atletas) todavía no está construido.
- **Deuda técnica conocida:** sin tests automatizados, sin CI, ESLint no configurado en `apps/web`/`apps/api` — ver [`docs/DEUDA-TECNICA.md`](./docs/DEUDA-TECNICA.md) para el detalle completo.

## Desarrollo

Este proyecto es un monorepo con npm workspaces.

```bash
npm install          # instala dependencias de todos los workspaces
npm run dev:web       # levanta el frontend del coach (apps/web)
npm run dev:api        # levanta el backend (apps/api)
```

### App móvil (iOS)

Requiere Xcode, CocoaPods y un simulador de iOS instalados.

```bash
cd apps/mobile
bundle install && bundle exec pod install   # solo la primera vez / tras agregar dependencias nativas
npx react-native start                       # servidor de Metro
npx react-native run-ios --simulator="iPhone 16"   # en otra terminal
```

La app apunta a `http://localhost:3000` (ver `apps/mobile/src/config/env.ts`) — necesita `apps/api` corriendo localmente. No hay configuración de entorno para staging/producción todavía.
