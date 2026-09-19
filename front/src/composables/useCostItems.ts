import { useApi } from "./useApi";

export type CostItemCategory =
  | "materials"
  | "labor"
  | "food"
  | "transport"
  | "subcontracted"
  | "other";

export interface LaborFormula {
  daysWorked: number;
  dailyRate: number;
  metersInstalled: number;
  ratePerMeter: number;
}

export interface CostItem {
  id: string;
  organizationId?: string;
  projectId: string;
  category: CostItemCategory;
  description: string;
  estimatedAmount?: number;
  amount: number;
  laborFormula?: LaborFormula;
  actualM2?: number;
  invoiceUrls: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface CreateCostItemPayload {
  category: CostItemCategory;
  description: string;
  estimatedAmount?: number;
  amount?: number;
  laborFormula?: LaborFormula;
  actualM2?: number;
}

const BASE = "/api/cost-items";

export function useCostItems() {
  const api = useApi();

  async function list(projectId: string): Promise<CostItem[]> {
    const result = await api.get(
      `${BASE}?projectId=${encodeURIComponent(projectId)}`,
    );
    return (result?.data ?? []) as CostItem[];
  }

  async function getById(id: string): Promise<CostItem> {
    const result = await api.get(`${BASE}/${id}`);
    return result?.data as CostItem;
  }

  async function create(
    projectId: string,
    payload: CreateCostItemPayload,
  ): Promise<CostItem> {
    const result = await api.post(BASE, { projectId, ...payload });
    return result?.data as CostItem;
  }

  async function update(
    id: string,
    payload: Partial<CreateCostItemPayload>,
  ): Promise<CostItem> {
    const result = await api.put(`${BASE}/${id}`, payload);
    return result?.data as CostItem;
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  async function addFactura(
    id: string,
    base64: string,
    mimeType: string,
  ): Promise<CostItem> {
    const result = await api.post(`${BASE}/${id}/facturas`, {
      imageBase64: base64,
      mimeType,
    });
    return result?.data as CostItem;
  }

  async function removeFactura(id: string, url: string): Promise<CostItem> {
    const result = await api.delete(`${BASE}/${id}/facturas`, { url });
    return result?.data as CostItem;
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
    addFactura,
    removeFactura,
  };
}
