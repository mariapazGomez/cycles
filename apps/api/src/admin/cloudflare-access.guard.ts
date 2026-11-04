import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AccessTokenVerifier } from "./access-token.verifier";

// Guarda de TODAS las rutas /admin/*: sin un token de Cloudflare Access válido
// responde 401, aunque alguien llegue directo a la API. No mira el
// `Authorization` de la app: un token de la app no sirve aquí.
@Injectable()
export class CloudflareAccessGuard implements CanActivate {
  constructor(private readonly verifier: AccessTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers["cf-access-jwt-assertion"];
    const token = typeof header === "string" ? header.trim() : "";
    if (!token) throw new UnauthorizedException();
    const { email } = await this.verifier.verify(token);
    req.adminEmail = email;
    return true;
  }
}

// Correo de quien consulta, tomado del token de Access.
export const AdminEmail = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().adminEmail;
});
