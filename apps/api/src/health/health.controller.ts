import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

// Chequeo de salud para Render (healthCheckPath en render.yaml): si responde
// 200, el deploy se da por bueno y el servicio recibe tráfico. No consulta la
// base a propósito: una caída breve de Supabase no debe reiniciar la API.
@Controller("health")
export class HealthController {
  @SkipThrottle()
  @Get()
  check() {
    return { status: "ok" };
  }
}
