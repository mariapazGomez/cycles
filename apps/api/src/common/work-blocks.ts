import { BadRequestException } from "@nestjs/common";
import { cleanNote } from "./exercise-note";

// Bloques de trabajo de una rutina o sesión (CYC-271, docs/diseno/sesion-por-bloques).
// La API solo importa TIPOS de @cycles/shared, así que los valores van copiados aquí; la
// prueba e2e de bloques compara estas listas con las del paquete para que no se separen.

export const BLOCK_TYPES = ["warmup", "plyometrics", "strength", "mobility", "cooldown", "cardio", "custom", "superset"] as const;
export type BlockTypeValue = (typeof BLOCK_TYPES)[number];

// Las 10 muestras del bloque personalizado (sin azul: el azul es de la app).
export const CUSTOM_BLOCK_COLORS = ["#e8a317", "#e0752b", "#d1494d", "#d9588f", "#8a63d2", "#1fa39a", "#2f9e5f", "#a0663a", "#4a5568", "#1f2228"] as const;

export const MAX_BLOCKS = 12;
export const MAX_STRUCTURE_EXERCISES = 60;
export const BLOCK_NAME_MAX_LENGTH = 40;

export interface BlockInputLike {
  id?: string;
  type: BlockTypeValue;
  name: string;
  color?: string | null;
  note?: string | null;
  exercises: unknown[];
}

export interface CleanBlock {
  id?: string;
  type: BlockTypeValue;
  name: string;
  color: string | null;
  note: string | null;
}

// Valida los bloques de una estructura y los devuelve limpios (nombre sin espacios de más,
// color en minúscula, nota sin espacios). Lanza 400 con un mensaje que el coach entiende.
export function cleanBlocks(blocks: BlockInputLike[], looseExerciseCount: number): CleanBlock[] {
  if (blocks.length > MAX_BLOCKS) {
    throw new BadRequestException(`Una rutina o sesión puede tener hasta ${MAX_BLOCKS} bloques.`);
  }
  const total = blocks.reduce((sum, b) => sum + b.exercises.length, 0) + looseExerciseCount;
  if (total > MAX_STRUCTURE_EXERCISES) {
    throw new BadRequestException(`Hay demasiados ejercicios: el máximo es ${MAX_STRUCTURE_EXERCISES}.`);
  }
  const ids = blocks.map((b) => b.id).filter((id): id is string => Boolean(id));
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException("Un bloque aparece repetido.");
  }
  return blocks.map((b) => {
    if (b.type === "superset") {
      throw new BadRequestException("Las superseries todavía no están disponibles.");
    }
    const name = b.name.trim();
    if (!name) throw new BadRequestException("Ponle un nombre al bloque.");
    if (name.length > BLOCK_NAME_MAX_LENGTH) {
      throw new BadRequestException(`El nombre del bloque puede tener hasta ${BLOCK_NAME_MAX_LENGTH} caracteres.`);
    }
    let color: string | null = null;
    if (b.color) {
      if (b.type !== "custom") throw new BadRequestException("Solo el bloque personalizado lleva color.");
      color = b.color.toLowerCase();
      if (!(CUSTOM_BLOCK_COLORS as readonly string[]).includes(color)) {
        throw new BadRequestException("Elige uno de los colores de la lista.");
      }
    }
    return { id: b.id, type: b.type, name, color, note: cleanNote(b.note) ?? null };
  });
}
