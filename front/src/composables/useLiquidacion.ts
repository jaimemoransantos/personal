import { useApi } from "./useApi";
import type { CostItemCategory } from "./useCostItems";

export interface LiquidacionSummary {
  totalIncome: number;
  costsByCategory: Record<CostItemCategory, number>;
  totalCost: number;
  margin: number;
  marginPercentage: number;
  geometricM2: number | null;
  actualM2: number | null;
  actualWastePercentage: number | null;
}

export interface LiquidacionExport {
  filename: string;
  base64: string;
}

export function useLiquidacion() {
  const api = useApi();

  async function getSummary(projectId: string): Promise<LiquidacionSummary> {
    const result = await api.get(`/api/projects/${projectId}/liquidacion`);
    return result?.data as LiquidacionSummary;
  }

  async function exportExcel(projectId: string): Promise<LiquidacionExport> {
    const result = await api.get(
      `/api/projects/${projectId}/liquidacion/export`,
    );
    return result?.data as LiquidacionExport;
  }

  return { getSummary, exportExcel };
}
