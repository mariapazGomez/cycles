# Cycles

Plataforma web para que entrenadores (coaches) diseñen y asignen ciclos de entrenamiento a sus atletas, y estos registren su progreso.

- Producto: ver [`docs/prds/PRD-General.md`](./docs/prds/PRD-General.md) — PRD padre de un sistema de PRDs enlazados (uno por funcionalidad, ver [`docs/prds/README.md`](./docs/prds/README.md)). Pensado para navegarse con [Obsidian](https://obsidian.md) abriendo `docs/` o `docs/prds/` como vault.
- Arquitectura técnica: ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Estructura del proyecto

```
cycles/
├── apps/
│   ├── web/     # Frontend — React + TypeScript + Vite
│   └── api/     # Backend — NestJS + TypeScript + Prisma
├── packages/
│   └── shared/  # Tipos/DTOs compartidos entre web y api
└── docs/        # PRD y documentación de arquitectura
```

## Stack

- **Frontend:** React, TypeScript, Vite, CSS Modules.
- **Backend:** Node.js, TypeScript, NestJS, Prisma ORM.
- **Base de datos:** PostgreSQL.
- **Autenticación:** Google OAuth, Apple OAuth, registro manual (email/contraseña) con JWT.

## Estado actual

Este repositorio contiene el **scaffolding base** (estructura de carpetas y configuración inicial) y el **PRD**. Todavía no hay funcionalidades implementadas: es la base sobre la que se construirá el producto en las siguientes fases (ver roadmap en el PRD).

## Desarrollo (una vez se instalen dependencias)

Este proyecto es un monorepo con npm workspaces.

```bash
npm install        # instala dependencias de todos los workspaces
npm run dev:web     # levanta el frontend (apps/web)
npm run dev:api      # levanta el backend (apps/api)
```
