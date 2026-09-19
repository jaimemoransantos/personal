import ExcelJS from "exceljs";
import type { CostItem, CostItemCategory } from "../types/costItem";
import type { LiquidacionSummary, Project } from "../types/project";
import { ApiError } from "../utils/errors";
import { CostItemService } from "./costItemService";
import { ProjectService } from "./projectService";

const CATEGORIES: CostItemCategory[] = [
  "materials",
  "labor",
  "food",
  "transport",
  "subcontracted",
  "other",
];

const CATEGORY_LABELS: Record<CostItemCategory, string> = {
  materials: "Materiales",
  labor: "Mano de obra",
  food: "Alimentación",
  transport: "Transporte",
  subcontracted: "Trabajo de terceros",
  other: "Otros",
};

const MONEY_FMT = '"$"#,##0.00';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyCostsByCategory(): Record<CostItemCategory, number> {
  return {
    materials: 0,
    labor: 0,
    food: 0,
    transport: 0,
    subcontracted: 0,
    other: 0,
  };
}

function clientNameFromSnapshot(client: unknown): string {
  if (client && typeof client === "object" && "name" in client) {
    const name = (client as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "—";
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "proyecto";
}

export class LiquidacionService {
  static async computeSummary(
    organizationId: string,
    projectId: string,
  ): Promise<LiquidacionSummary> {
    const project = await ProjectService.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const costItems = await CostItemService.list(organizationId, projectId);
    return LiquidacionService.buildSummary(project, costItems);
  }

  /** Pure helper for tests and shared use by export. */
  static buildSummary(
    project: Project & { id?: string },
    costItems: CostItem[],
  ): LiquidacionSummary {
    // Liquidación uses income without IVA. quotationSnapshot.amount includes IVA.
    const snapshot = project.quotationSnapshot;
    const subtotal = Number(snapshot?.subtotal) || 0;
    const discount = Number(snapshot?.discount) || 0;
    const totalIncome = round2(Math.max(0, subtotal - discount));
    const costsByCategory = emptyCostsByCategory();
    let totalCost = 0;

    for (const item of costItems) {
      const amount = Number(item.amount) || 0;
      totalCost += amount;
      if (CATEGORIES.includes(item.category)) {
        costsByCategory[item.category] = round2(
          costsByCategory[item.category] + amount,
        );
      }
    }
    totalCost = round2(totalCost);

    const margin = round2(totalIncome - totalCost);
    const marginPercentage =
      totalIncome > 0 ? round2((margin / totalIncome) * 100) : 0;

    const elements = project.elements ?? [];
    const geometricM2 =
      elements.length > 0
        ? round2(
            elements.reduce(
              (sum, el) => sum + (Number(el.m2Snapshot) || 0),
              0,
            ),
          )
        : null;

    const materialsWithM2 = costItems.filter(
      (item) =>
        item.category === "materials" &&
        item.actualM2 != null &&
        Number.isFinite(Number(item.actualM2)),
    );
    const actualM2 =
      materialsWithM2.length > 0
        ? round2(
            materialsWithM2.reduce(
              (sum, item) => sum + (Number(item.actualM2) || 0),
              0,
            ),
          )
        : null;

    let actualWastePercentage: number | null = null;
    if (
      geometricM2 != null &&
      actualM2 != null &&
      geometricM2 > 0
    ) {
      actualWastePercentage = round2(
        ((actualM2 - geometricM2) / geometricM2) * 100,
      );
    }

    return {
      totalIncome,
      costsByCategory,
      totalCost,
      margin,
      marginPercentage,
      geometricM2,
      actualM2,
      actualWastePercentage,
    };
  }

  static async exportToExcel(
    organizationId: string,
    projectId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const project = await ProjectService.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const costItems = await CostItemService.list(organizationId, projectId);
    const summary = LiquidacionService.buildSummary(project, costItems);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Geomtech";
    workbook.created = new Date();

    const resumen = workbook.addWorksheet("Resumen");
    resumen.getColumn(1).width = 28;
    resumen.getColumn(2).width = 18;

    resumen.getCell("A1").value = "Proyecto";
    resumen.getCell("B1").value = project.name;
    resumen.getCell("A2").value = "Cliente";
    resumen.getCell("B2").value = clientNameFromSnapshot(
      project.quotationSnapshot?.client,
    );
    resumen.getCell("A3").value = "Nro. cotización";
    resumen.getCell("B3").value =
      project.quotationSnapshot?.quoteNumber || "—";

    for (const row of [1, 2, 3]) {
      resumen.getCell(`A${row}`).font = { bold: true };
    }

    resumen.getCell("A5").value = "Concepto";
    resumen.getCell("B5").value = "Valor";
    resumen.getCell("A5").font = { bold: true };
    resumen.getCell("B5").font = { bold: true };

    const moneyRows: { label: string; value: number }[] = [
      { label: "Ingreso total", value: summary.totalIncome },
      { label: "Costo total", value: summary.totalCost },
      { label: "Margen ($)", value: summary.margin },
    ];

    let rowIdx = 6;
    for (const row of moneyRows) {
      resumen.getCell(`A${rowIdx}`).value = row.label;
      resumen.getCell(`B${rowIdx}`).value = row.value;
      resumen.getCell(`B${rowIdx}`).numFmt = MONEY_FMT;
      rowIdx++;
    }

    resumen.getCell(`A${rowIdx}`).value = "Margen (%)";
    resumen.getCell(`B${rowIdx}`).value = summary.marginPercentage / 100;
    resumen.getCell(`B${rowIdx}`).numFmt = "0.00%";
    rowIdx += 2;

    if (summary.geometricM2 != null || summary.actualM2 != null) {
      resumen.getCell(`A${rowIdx}`).value = "Métrica";
      resumen.getCell(`B${rowIdx}`).value = "Valor";
      resumen.getCell(`A${rowIdx}`).font = { bold: true };
      resumen.getCell(`B${rowIdx}`).font = { bold: true };
      rowIdx++;

      if (summary.geometricM2 != null) {
        resumen.getCell(`A${rowIdx}`).value = "m² geométrico";
        resumen.getCell(`B${rowIdx}`).value = summary.geometricM2;
        rowIdx++;
      }
      if (summary.actualM2 != null) {
        resumen.getCell(`A${rowIdx}`).value = "m² real comprado";
        resumen.getCell(`B${rowIdx}`).value = summary.actualM2;
        rowIdx++;
      }
      if (summary.actualWastePercentage != null) {
        resumen.getCell(`A${rowIdx}`).value = "% desperdicio real";
        resumen.getCell(`B${rowIdx}`).value =
          summary.actualWastePercentage / 100;
        resumen.getCell(`B${rowIdx}`).numFmt = "0.00%";
        rowIdx++;
      }
    }

    rowIdx += 1;
    resumen.getCell(`A${rowIdx}`).value = "Costos por categoría";
    resumen.getCell(`A${rowIdx}`).font = { bold: true };
    rowIdx++;
    resumen.getCell(`A${rowIdx}`).value = "Categoría";
    resumen.getCell(`B${rowIdx}`).value = "Monto";
    resumen.getCell(`A${rowIdx}`).font = { bold: true };
    resumen.getCell(`B${rowIdx}`).font = { bold: true };
    rowIdx++;
    for (const cat of CATEGORIES) {
      resumen.getCell(`A${rowIdx}`).value = CATEGORY_LABELS[cat];
      resumen.getCell(`B${rowIdx}`).value = summary.costsByCategory[cat];
      resumen.getCell(`B${rowIdx}`).numFmt = MONEY_FMT;
      rowIdx++;
    }

    const rubros = workbook.addWorksheet("Rubros de costos");
    rubros.columns = [
      { header: "Categoría", key: "category", width: 16 },
      { header: "Descripción", key: "description", width: 40 },
      { header: "Monto Estimado", key: "estimatedAmount", width: 15 },
      { header: "Monto Real", key: "amount", width: 15 },
      { header: "Diferencia", key: "difference", width: 15 },
      { header: "Factura(s)", key: "invoice1", width: 16 },
      { header: "", key: "invoice2", width: 16 },
      { header: "", key: "invoice3", width: 16 },
    ];
    rubros.getRow(1).font = { bold: true };

    let dataRow = 2;
    for (const item of costItems) {
      const estimated =
        typeof item.estimatedAmount === "number" ? item.estimatedAmount : null;
      const real = Number(item.amount) || 0;
      const difference =
        estimated != null ? round2(real - estimated) : null;

      rubros.getCell(dataRow, 1).value =
        CATEGORY_LABELS[item.category] ?? item.category;
      rubros.getCell(dataRow, 2).value = item.description;
      if (estimated != null) {
        rubros.getCell(dataRow, 3).value = estimated;
        rubros.getCell(dataRow, 3).numFmt = MONEY_FMT;
      } else {
        rubros.getCell(dataRow, 3).value = "—";
      }
      rubros.getCell(dataRow, 4).value = real;
      rubros.getCell(dataRow, 4).numFmt = MONEY_FMT;
      if (difference != null) {
        rubros.getCell(dataRow, 5).value = difference;
        rubros.getCell(dataRow, 5).numFmt = MONEY_FMT;
      } else {
        rubros.getCell(dataRow, 5).value = "—";
      }

      const urls = item.invoiceUrls ?? [];
      urls.forEach((url, idx) => {
        const col = 6 + idx;
        if (col > 20) return;
        const cell = rubros.getCell(dataRow, col);
        cell.value = {
          text: `Ver factura ${idx + 1}`,
          hyperlink: url,
        };
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      });

      dataRow++;
    }

    rubros.getCell(dataRow, 1).value = "TOTAL";
    rubros.getCell(dataRow, 1).font = { bold: true };
    rubros.getCell(dataRow, 4).value = summary.totalCost;
    rubros.getCell(dataRow, 4).numFmt = MONEY_FMT;
    rubros.getCell(dataRow, 4).font = { bold: true };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `liquidacion-${sanitizeFilename(project.name)}.xlsx`;
    return { buffer, filename };
  }
}
