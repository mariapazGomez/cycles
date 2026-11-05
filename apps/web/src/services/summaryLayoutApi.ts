import { apiRequest } from "./httpClient";
import type { ChartDefinition, SummaryLayout } from "@cycles/shared";

// Disposición de la pizarra de gráficos del Resumen (CYC-238): una por coach.
// Los tipos son los de la API (@cycles/shared), no una copia.
export type { SummaryLayout };

export function getSummaryLayout() {
  return apiRequest<SummaryLayout>("/coach/summary-layout");
}

export function saveSummaryLayout(charts: ChartDefinition[]) {
  return apiRequest<SummaryLayout>("/coach/summary-layout", { method: "PUT", body: { charts } });
}
