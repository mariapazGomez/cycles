import { API_URL } from "./httpClient";

// La API en Render (plan gratuito) se duerme tras 15 minutos sin tráfico y
// tarda hasta un minuto en despertar. Para que quien llega a la web no espere
// justo cuando necesita la API (enviar el formulario de la landing, iniciar
// sesión), apenas carga la página se le hace un pedido de despertar a /health
// y la API se va despertando mientras la persona lee o escribe.
//
// "no-cors": no hace falta leer la respuesta (solo despertar), así que no
// depende de CORS. Solo en producción, para no ensuciar la consola en local.
let warmed = false;

export function warmUpApi(): void {
  if (warmed || !import.meta.env.PROD) return;
  warmed = true;
  void fetch(`${API_URL}/health`, { mode: "no-cors", cache: "no-store" }).catch(() => undefined);
}
