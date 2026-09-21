import { createHash, randomBytes, randomUUID } from "crypto";

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateJti(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
