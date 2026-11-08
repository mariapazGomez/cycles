import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { EVENT_DURATION_MAX, EVENT_NOTES_MAX, EVENT_RANGE_MAX_DAYS as SHARED_RANGE, EVENT_TITLE_MAX } from "@cycles/shared";
import { EVENT_DURATION_MAX as DURATION, EVENT_NOTES_MAX as NOTES, EVENT_TITLE_MAX as TITLE } from "./events/event-input";
import { EVENT_RANGE_MAX_DAYS as RANGE } from "./events/recurrence";

// La API compila a `dist/main.js` (Render arranca `node apps/api/dist/main.js`). Con el alias
// `paths` de @cycles/shared en el tsconfig, el compilador metía el paquete compartido en la salida,
// la carpeta pasaba a `dist/apps/api/src/main.js` y el despliegue fallaba (CYC-251, desde #202).
// Ya no hay alias, pero @cycles/shared apunta a `src/index.ts` (TypeScript): en tiempo de
// ejecución Node no puede cargarlo, así que la API solo importa TIPOS (`import type` / `export type`).

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.ts$/.test(name) && !/\.(spec|e2e-spec)\.ts$/.test(name) ? [path] : [];
  });
}

describe("compilación de la API", () => {
  it("ningún archivo importa valores de @cycles/shared (solo tipos)", () => {
    const offenders = sources(__dirname).filter((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .some((line) => /from ["']@cycles\/shared["']/.test(line) && !/^\s*(import|export) type\b/.test(line)),
    );
    expect(offenders.map((f) => f.replace(__dirname, "src"))).toEqual([]);
  });

  it("los límites copiados de las actividades paralelas siguen iguales a los compartidos", () => {
    expect([TITLE, NOTES, DURATION, RANGE]).toEqual([EVENT_TITLE_MAX, EVENT_NOTES_MAX, EVENT_DURATION_MAX, SHARED_RANGE]);
  });
});
