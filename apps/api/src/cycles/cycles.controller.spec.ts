import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { CyclesController } from "./cycles.controller";
import { SessionsController } from "../sessions/sessions.controller";

// Quién puede llamar a cada ruta nueva: solo el coach. El guard de roles lee
// estos metadatos; si alguien quita el decorador, la prueba falla.
describe("roles de las rutas de plantillas", () => {
  const rolesOf = (target: object, method: string) => Reflect.getMetadata(ROLES_KEY, (target as Record<string, object>)[method]);

  it.each(["createTemplate", "updateTemplate", "assign", "create", "update"])("CyclesController.%s es solo del coach", (method) => {
    expect(rolesOf(CyclesController.prototype, method)).toEqual(["coach"]);
  });

  it("SessionsController.create es solo del coach", () => {
    const method = Object.getOwnPropertyNames(SessionsController.prototype).find((name) => /^create/.test(name))!;
    expect(rolesOf(SessionsController.prototype, method)).toEqual(["coach"]);
  });
});
