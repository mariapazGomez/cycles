import { ApiError } from "../src/services/httpClient";
import { limitMessage, shouldRetry } from "../src/services/queryRetry";

jest.mock("../src/services/httpClient", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

describe("reintentos de las consultas", () => {
  it("no reintenta un rechazo, tampoco el de demasiados intentos", () => {
    for (const status of [400, 403, 404, 409, 429]) {
      expect(shouldRetry(0, new ApiError(status, "x"))).toBe(false);
    }
  });

  it("reintenta hasta tres veces los fallos del servidor y de red", () => {
    for (const error of [new ApiError(500, "x"), new ApiError(502, "x"), new TypeError("Failed to fetch")]) {
      expect([0, 1, 2, 3].map((n) => shouldRetry(n, error))).toEqual([true, true, true, false]);
    }
  });

  it("cuando fue por el límite, el aviso dice cuánto esperar", () => {
    const wait = "Hiciste demasiados intentos. Puedes volver a intentarlo en 1 minuto.";
    expect(limitMessage([new ApiError(500, "otro"), new ApiError(429, wait)])).toBe(wait);
    expect(limitMessage([new ApiError(500, "otro")])).toBeNull();
  });
});
