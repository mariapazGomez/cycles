import patternA from "./proteina-a.svg";
import patternB from "./proteina-b.svg";
import patternC from "./proteina-c.svg";

// Fondos de cadenas de proteína (motivo de marca, ver docs/brand/identidad-visual.md).
// Cada variante tiene recorridos distintos: "a" para entrar (login, registro,
// invitación), "b" para los pasos de email y contraseña, "c" para errores,
// esperas y estados vacíos.
export const PATTERNS = { a: patternA, b: patternB, c: patternC };
export type PatternName = keyof typeof PATTERNS;
