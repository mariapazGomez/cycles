import { ApiError } from "./httpClient";

const MAX_RETRIES = 3;

// Un rechazo (4xx, incluido «demasiados intentos») no se arregla pidiendo de nuevo
// enseguida: reintentar suma peticiones al límite y atrasa el aviso en pantalla. Los
// fallos de red y del servidor sí se reintentan, como antes.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

// Lo que se agrega al aviso cuando fue por el límite: el texto de la API dice cuánto esperar.
export function limitMessage(errors: unknown[]): string | null {
  const limited = errors.find((e): e is ApiError => e instanceof ApiError && e.status === 429);
  return limited ? limited.message : null;
}
