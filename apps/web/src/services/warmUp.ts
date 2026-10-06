import { API_URL } from "./httpClient";

// La API en Render (plan gratuito) se duerme tras 15 minutos sin tráfico y
// tarda hasta un minuto en despertar. Para que quien llega a la web no espere
// justo cuando necesita la API (enviar el formulario de la landing, iniciar
// sesión), apenas carga la página se le hace un pedido de despertar a /health
// y la API se va despertando mientras la persona lee o escribe.
//
// Pedido en modo CORS normal (la API lo permite para este dominio). Con
// "no-cors" el pedido también despertaba la API, pero la cabecera
// Cross-Origin-Resource-Policy: same-origin que manda helmet hacía que el
// navegador descartara la respuesta con un error en la consola de cada
// visitante. Solo en producción, para no ensuciar la consola en local.
let warmed = false;

export function warmUpApi(): void {
  if (warmed || !import.meta.env.PROD) return;
  warmed = true;
  void fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => undefined);
}
