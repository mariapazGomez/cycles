import { BadRequestException } from "@nestjs/common";

// Disposición de la pizarra de gráficos del Resumen del atleta (CYC-238, diseño
// docs/diseno/resumen-atleta). Cada gráfico es una definición; la disposición
// guardada es la lista ORDENADA de definiciones (la posición es el orden de la
// lista). Los cinco del sistema se pueden ocultar y mover, pero no editar ni
// quitar; los del coach (fase 2: el constructor) llevan medida, agrupación y forma.

export const SYSTEM_CHART_IDS = ["plan-real", "progreso-ciclo", "constancia", "esfuerzo", "costo-ejercicio"] as const;
export type SystemChartId = (typeof SYSTEM_CHART_IDS)[number];

export const SIZES = ["mitad", "completo"] as const;
export const ORIGINS = ["sistema", "coach"] as const;
export const MEASURES = [
  "carga_kg",
  "series",
  "repeticiones_plan",
  "repeticiones_real",
  "peso_plan",
  "peso_real",
  "rir_plan",
  "rir_real",
  "esfuerzo",
  "duracion_min",
  "estado_sesion",
  "dolor",
] as const;
export const GROUPINGS = ["semana", "sesion", "ejercicio", "grupo_muscular"] as const;
export const SHAPES = ["columnas", "linea", "apiladas", "dos_lineas"] as const;
export const SESSION_STATES = ["hecha", "omitida", "pendiente"] as const;

export const MAX_CHARTS = 30;
const MAX_TITLE = 80;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export interface ChartFilters {
  ejercicioId?: string;
  periodoSemanas?: number;
  estadoSesion?: (typeof SESSION_STATES)[number];
}

export interface ChartDefinition {
  id: string;
  origen: (typeof ORIGINS)[number];
  tamano: (typeof SIZES)[number];
  visible: boolean;
  titulo?: string;
  medida?: (typeof MEASURES)[number];
  agrupar?: (typeof GROUPINGS)[number];
  forma?: (typeof SHAPES)[number];
  filtros?: ChartFilters;
}

// Lo que ve un coach que todavía no guardó nada: los cinco del sistema, el de plan
// contra real a todo lo ancho y primero (es el protagonista del diseño).
export function defaultLayout(): ChartDefinition[] {
  return SYSTEM_CHART_IDS.map((id) => ({
    id,
    origen: "sistema",
    tamano: id === "plan-real" ? "completo" : "mitad",
    visible: true,
  }));
}

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    return fail(`«${field}» debe ser uno de: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function onlyKeys(obj: Record<string, unknown>, allowed: string[], where: string): void {
  const extra = Object.keys(obj).filter((k) => !allowed.includes(k));
  if (extra.length > 0) fail(`${where}: campos que no existen (${extra.join(", ")}).`);
}

function parseFilters(value: unknown, where: string): ChartFilters {
  if (!isRecord(value)) return fail(`${where}: «filtros» debe ser un objeto.`);
  onlyKeys(value, ["ejercicioId", "periodoSemanas", "estadoSesion"], `${where} «filtros»`);
  const filters: ChartFilters = {};
  if (value.ejercicioId !== undefined) {
    if (typeof value.ejercicioId !== "string" || value.ejercicioId.length === 0 || value.ejercicioId.length > 64) {
      fail(`${where}: «ejercicioId» no es válido.`);
    }
    filters.ejercicioId = value.ejercicioId as string;
  }
  if (value.periodoSemanas !== undefined) {
    const weeks = value.periodoSemanas;
    if (typeof weeks !== "number" || !Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      fail(`${where}: «periodoSemanas» debe ser un entero entre 1 y 52.`);
    }
    filters.periodoSemanas = weeks as number;
  }
  if (value.estadoSesion !== undefined) filters.estadoSesion = oneOf(value.estadoSesion, SESSION_STATES, "estadoSesion");
  return filters;
}

// Valida a fondo la lista que manda el coach y devuelve solo lo permitido (nada
// de campos de más). Reglas: ids únicos; los cinco del sistema están todos, una
// sola vez y sin editar; los del coach llevan título, medida, agrupación y forma.
export function parseLayout(input: unknown): ChartDefinition[] {
  if (!Array.isArray(input)) return fail("«charts» debe ser una lista.");
  if (input.length > MAX_CHARTS) return fail(`Hay demasiados gráficos (máximo ${MAX_CHARTS}).`);

  const seen = new Set<string>();
  const result: ChartDefinition[] = [];
  input.forEach((raw, index) => {
    const where = `Gráfico ${index + 1}`;
    if (!isRecord(raw)) return fail(`${where}: no es un objeto.`);
    const id = raw.id;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) return fail(`${where}: «id» no es válido.`);
    if (seen.has(id)) return fail(`${where}: el id «${id}» está repetido.`);
    seen.add(id);

    const origen = oneOf(raw.origen, ORIGINS, "origen");
    const tamano = oneOf(raw.tamano, SIZES, "tamano");
    if (typeof raw.visible !== "boolean") return fail(`${where}: «visible» debe ser verdadero o falso.`);
    const base = { id, origen, tamano, visible: raw.visible };

    if (origen === "sistema") {
      if (!(SYSTEM_CHART_IDS as readonly string[]).includes(id)) return fail(`${where}: «${id}» no es un gráfico del sistema.`);
      onlyKeys(raw, ["id", "origen", "tamano", "visible"], where);
      result.push(base);
      return;
    }

    if ((SYSTEM_CHART_IDS as readonly string[]).includes(id)) return fail(`${where}: el id «${id}» es de un gráfico del sistema.`);
    onlyKeys(raw, ["id", "origen", "tamano", "visible", "titulo", "medida", "agrupar", "forma", "filtros"], where);
    const titulo = typeof raw.titulo === "string" ? raw.titulo.trim() : "";
    if (titulo.length === 0 || titulo.length > MAX_TITLE) return fail(`${where}: el título debe tener entre 1 y ${MAX_TITLE} caracteres.`);
    const chart: ChartDefinition = {
      ...base,
      titulo,
      medida: oneOf(raw.medida, MEASURES, "medida"),
      agrupar: oneOf(raw.agrupar, GROUPINGS, "agrupar"),
      forma: oneOf(raw.forma, SHAPES, "forma"),
    };
    if (raw.filtros !== undefined) chart.filtros = parseFilters(raw.filtros, where);
    result.push(chart);
  });

  const missing = SYSTEM_CHART_IDS.filter((id) => !seen.has(id));
  if (missing.length > 0) return fail(`Faltan gráficos del sistema (se ocultan con «visible», no se quitan): ${missing.join(", ")}.`);
  return result;
}
