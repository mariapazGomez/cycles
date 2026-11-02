import { ForbiddenException } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";

// Refresh token de la web en una cookie `httpOnly` (S-08, R2): ningún script de la
// página puede leerlo, así que un XSS no puede robar la sesión de 30 días.
//
// - Solo se usa cuando el pedido trae `X-Cycles-Client: web`. La app móvil no manda
//   esa cabecera: sigue recibiendo y mandando el token en el cuerpo, y la API
//   ignora cualquier cookie que llegue sin ella.
// - En modo web el refresh token NUNCA va en el cuerpo de la respuesta (si no, un
//   script podría leerlo llamando a /auth/refresh).
// - La cookie solo viaja a /auth (`Path`), no a cada endpoint.
// Ver docs/PLAN-Seguridad.md, 2A, y docs/SEGURIDAD.md, S-08.

export const CLIENT_HEADER = "x-cycles-client";
export const REFRESH_COOKIE = "cycles_rt";
const REFRESH_COOKIE_PATH = "/auth";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // igual que el refresh token (auth.service)

export function isWebClient(req: Request): boolean {
  return req.headers[CLIENT_HEADER] === "web";
}

function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: "strict", path: REFRESH_COOKIE_PATH };
}

export function setRefreshCookie(res: Response, token: string, secure: boolean): void {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(secure), maxAge: REFRESH_COOKIE_MAX_AGE_MS });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE, cookieOptions(secure));
}

export function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== REFRESH_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim()) || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Protección CSRF para lo que se autentica con la cookie: además de SameSite=Strict,
// el pedido debe venir de la web de Cycles (`Origin` en la lista de CORS). Sin
// `Origin` se rechaza: un navegador siempre lo manda en un POST de otro origen.
export function assertAllowedOrigin(req: Request, allowed: string[]): void {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !allowed.includes(origin)) {
    throw new ForbiddenException("Origen no permitido.");
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Entrega los tokens según el cliente: la web recibe el refresh en la cookie y solo
// el access token en el cuerpo; el resto (la app móvil) recibe ambos en el cuerpo.
export function deliverTokens(req: Request, res: Response, tokens: TokenPair, secure: boolean): TokenPair | { accessToken: string } {
  if (!isWebClient(req)) return tokens;
  setRefreshCookie(res, tokens.refreshToken, secure);
  return { accessToken: tokens.accessToken };
}
