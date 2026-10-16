import { Transform } from "class-transformer";

// Un mismo email puede llegar escrito de varias formas ("Ana@Gmail.com ",
// "ana@gmail.com"). Se guarda y se busca siempre recortado y en minúsculas,
// para que invitar, registrar y entrar hablen de la misma cuenta.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === "string" ? normalizeEmail(value) : value));
