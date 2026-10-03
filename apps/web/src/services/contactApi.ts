import { apiRequest } from "./httpClient";

// Formulario de contacto de la landing. Público: sin sesión.
// `website` es el campo señuelo (siempre vacío para una persona) y
// `elapsedMs` el tiempo que tardó en llenarlo; la API los usa para detectar bots.
export function sendContact(data: { email: string; message: string; website: string; elapsedMs: number }) {
  return apiRequest<{ ok: true }>("/contact", {
    method: "POST",
    auth: false,
    body: data,
  });
}
