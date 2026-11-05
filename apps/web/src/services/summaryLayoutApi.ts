import { apiRequest } from "./httpClient";
import type { ChartDef } from "../lib/summaryBoard";

// Disposición de la pizarra de gráficos del Resumen (CYC-238): una por coach.
export interface SummaryLayout {
  charts: ChartDef[];
  isDefault: boolean;
}

export function getSummaryLayout() {
  return apiRequest<SummaryLayout>("/coach/summary-layout");
}

export function saveSummaryLayout(charts: ChartDef[]) {
  return apiRequest<SummaryLayout>("/coach/summary-layout", { method: "PUT", body: { charts } });
}
