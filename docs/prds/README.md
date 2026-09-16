---
type: index
tags: [prd, meta]
---

# Convención de PRDs

Este directorio es un **vault de Obsidian** (abrir `docs/` o `docs/prds/` directamente como vault en Obsidian). Contiene un PRD general que actúa como padre, y un PRD por cada funcionalidad como hijo, enlazados entre sí con wikilinks.

## Estructura

```
docs/prds/
├── README.md                       # este archivo
├── PRD-General.md                  # PRD padre — visión completa del producto
├── _templates/
│   └── PRD-Feature-Template.md     # plantilla para crear un PRD hijo nuevo
└── features/
    └── PRD-<Funcionalidad>.md      # un archivo por funcionalidad
```

## Cómo crear un PRD hijo nuevo

1. Copiar `_templates/PRD-Feature-Template.md` a `features/PRD-<NombreFuncionalidad>.md` (usar PascalCase o kebab-case sin espacios, igual que `PRD-Autenticacion.md`).
2. Completar el frontmatter: `status`, `phase`, `created`/`updated`, `tags`, `related` (otros PRDs hermanos relacionados, como `["[[PRD-Ciclos]]"]`).
3. El campo `parent: "[[PRD-General]]"` ya viene en la plantilla — no cambiarlo salvo que en el futuro haya sub-features con su propio padre intermedio.
4. Agregar una fila en la tabla de la sección **"0. PRDs hijos / Funcionalidades"** de [[PRD-General]], con el estado y la fase.
5. Si la funcionalidad toca el modelo de datos, documentar solo el **delta** (tablas/campos nuevos) — el modelo de datos completo vive únicamente en el PRD general para no duplicar ni desincronizar.

## Cómo enlazar entre PRDs

- **Hijo → padre:** vía frontmatter (`parent: "[[PRD-General]]"`) y además con un wikilink explícito en el cuerpo (`> Hijo de [[PRD-General]]`), para que sea legible aunque no se use Dataview.
- **Padre → hijos:** tabla manual en la sección 0 de `PRD-General.md`, **y** automáticamente vía el panel de *Backlinks* de Obsidian (como todo hijo enlaza al padre, el padre siempre muestra todos sus hijos ahí, aunque se te olvide actualizar la tabla).
- **Hijo ↔ hijo (PRDs hermanos relacionados):** campo `related` en el frontmatter, más un wikilink en la sección "9. Dependencias" de cada uno.

## Estados (`status` en frontmatter)

| Estado | Significado |
|---|---|
| `draft` | En redacción, aún no validado. |
| `in-review` | Listo para revisión/discusión. |
| `approved` | Aprobado, listo para implementarse. |
| `in-progress` | En desarrollo. |
| `done` | Implementado y en producción. |

## Tags

- `prd` — todo PRD (padre o hijo) lo lleva.
- `general` — solo `PRD-General.md`.
- `feature/<slug>` — un tag por funcionalidad (p. ej. `feature/auth`), útil para filtrar en el buscador de Obsidian o en Dataview.

## Uso con Obsidian (opcional)

- **Graph view:** con esta convención, el grafo de Obsidian mostrará naturalmente `PRD-General` en el centro y cada PRD hijo conectado a él.
- **Dataview (plugin community, opcional):** si lo instalas, puedes reemplazar la tabla manual de `PRD-General.md` por una consulta automática, por ejemplo:

  ````
  ```dataview
  table status, phase
  from "docs/prds/features"
  sort phase asc
  ```
  ````

  No es necesario instalarlo — la tabla manual funciona igual sin plugins, incluso viendo los `.md` en GitHub.
- `.obsidian/` (configuración local del vault, generada al abrir la carpeta en la app) está en `.gitignore` — es estado local de tu instalación, no de contenido.
