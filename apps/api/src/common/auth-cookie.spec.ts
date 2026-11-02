import { ForbiddenException } from "@nestjs/common";
import { assertAllowedOrigin, clearRefreshCookie, deliverTokens, isWebClient, readRefreshCookie, setRefreshCookie } from "./auth-cookie";

const req = (headers: Record<string, string>) => ({ headers }) as never;
const res = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });
const tokens = { accessToken: "acceso", refreshToken: "refresco" };

describe("cookie del refresh token", () => {
  it("la cookie es httpOnly, SameSite=Strict, con Path=/auth y 30 días", () => {
    const r = res();
    setRefreshCookie(r as never, "refresco", false);
    const [name, value, options] = r.cookie.mock.calls[0];
    expect(name).toBe("cycles_rt");
    expect(value).toBe("refresco");
    expect(options).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/auth", maxAge: 30 * 24 * 3600 * 1000 });
    expect(options).not.toHaveProperty("domain");
  });

  it("en producción la cookie es Secure; en local no (se usa http)", () => {
    const prod = res();
    const dev = res();
    setRefreshCookie(prod as never, "x", true);
    setRefreshCookie(dev as never, "x", false);
    expect(prod.cookie.mock.calls[0][2].secure).toBe(true);
    expect(dev.cookie.mock.calls[0][2].secure).toBe(false);
  });

  it("borrar la cookie usa los mismos atributos (si no, el navegador no la borra)", () => {
    const r = res();
    clearRefreshCookie(r as never, true);
    expect(r.clearCookie).toHaveBeenCalledWith("cycles_rt", { httpOnly: true, secure: true, sameSite: "strict", path: "/auth" });
  });

  it("lee la cookie entre otras y devuelve nada si no está o está mal codificada", () => {
    expect(readRefreshCookie(req({ cookie: "a=1; cycles_rt=abc.def; b=2" }))).toBe("abc.def");
    expect(readRefreshCookie(req({ cookie: "otra=1" }))).toBeUndefined();
    expect(readRefreshCookie(req({}))).toBeUndefined();
    expect(readRefreshCookie(req({ cookie: "cycles_rt=%E0%A4%A" }))).toBeUndefined();
    expect(readRefreshCookie(req({ cookie: "cycles_rt=" }))).toBeUndefined();
  });

  it("solo el cliente web (cabecera exacta) recibe la cookie", () => {
    expect(isWebClient(req({ "x-cycles-client": "web" }))).toBe(true);
    expect(isWebClient(req({ "x-cycles-client": "mobile" }))).toBe(false);
    expect(isWebClient(req({}))).toBe(false);
  });

  it("la web recibe solo el access token y la cookie; el resto recibe ambos en el cuerpo", () => {
    const web = res();
    expect(deliverTokens(req({ "x-cycles-client": "web" }), web as never, tokens, false)).toEqual({ accessToken: "acceso" });
    expect(web.cookie).toHaveBeenCalledTimes(1);
    const mobile = res();
    expect(deliverTokens(req({}), mobile as never, tokens, false)).toEqual(tokens);
    expect(mobile.cookie).not.toHaveBeenCalled();
  });

  it("el Origin debe estar en la lista; ausente o ajeno da 403", () => {
    const allowed = ["https://app.getcycles.app"];
    expect(() => assertAllowedOrigin(req({ origin: "https://app.getcycles.app" }), allowed)).not.toThrow();
    expect(() => assertAllowedOrigin(req({ origin: "https://app.getcycles.app.malo.example" }), allowed)).toThrow(ForbiddenException);
    expect(() => assertAllowedOrigin(req({}), allowed)).toThrow(ForbiddenException);
  });
});
