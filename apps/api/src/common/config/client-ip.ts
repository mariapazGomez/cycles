import { isIP } from "net";
import type { NextFunction, Request, Response } from "express";

// En Render, X-Forwarded-For no sirve para la IP real: su proxy agrega al valor que
// manda el cliente en vez de reemplazarlo, así que cualquiera podría inventar su IP
// y esquivar el límite de intentos. La IP confiable llega en un header que pone
// Cloudflare (delante de Render) y que el cliente no puede pisar:
// CLIENT_IP_HEADER=true-client-ip. Todo lo que usa req.ip (límite de intentos,
// alertas de seguridad) toma este valor. Ver docs/SEGURIDAD.md, S-13.
export function clientIpMiddleware(headerName: string) {
  const header = headerName.trim().toLowerCase();
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.headers[header];
    const ip = (Array.isArray(value) ? value[0] : value)?.trim();
    if (ip && isIP(ip)) {
      Object.defineProperty(req, "ip", { value: ip, configurable: true });
    }
    next();
  };
}
