import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { defaultLayout, parseLayout, type ChartDefinition } from "./summary-layout";

// Disposición de la pizarra del Resumen: una por coach, siempre la suya (el id
// sale del token, nunca de la ruta ni del cuerpo).
@Injectable()
export class SummaryLayoutService {
  constructor(private readonly prisma: PrismaService) {}

  async get(coachId: string): Promise<{ charts: ChartDefinition[]; isDefault: boolean }> {
    const saved = await this.prisma.coachSummaryLayout.findUnique({ where: { coachId } });
    if (!saved) return { charts: defaultLayout(), isDefault: true };
    // Lo guardado pasó por `parseLayout`; si alguna vez dejara de ser válido, se
    // vuelve a la disposición de siempre en vez de romper la pizarra.
    try {
      return { charts: parseLayout(saved.charts), isDefault: false };
    } catch {
      return { charts: defaultLayout(), isDefault: true };
    }
  }

  async save(coachId: string, input: unknown): Promise<{ charts: ChartDefinition[]; isDefault: boolean }> {
    const charts = parseLayout(input);
    const data = charts as unknown as Prisma.InputJsonValue;
    await this.prisma.coachSummaryLayout.upsert({
      where: { coachId },
      create: { coachId, charts: data },
      update: { charts: data },
    });
    return { charts, isDefault: false };
  }
}
