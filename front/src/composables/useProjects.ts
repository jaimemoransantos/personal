import { useApi } from "./useApi";

export type ProjectStatus =
  | "planificado"
  | "instalando"
  | "liquidado"
  | "cerrado";

export interface ProjectElement {
  designId: string;
  designName: string;
  designType: string;
  m2Snapshot: number;
  linkedAt: unknown;
}

export interface QuotationSnapshot {
  quoteNumber: string;
  client: {
    name?: string;
    document?: string;
    phone?: string;
    email?: string;
    address?: string;
    directedTo?: string;
    reference?: string;
    project?: string;
  };
  items: unknown[];
  amount: number;
  subtotal: number;
  discount: number;
}

export interface Project {
  id: string;
  organizationId: string;
  quotationId: string;
  quotationSnapshot: QuotationSnapshot;
  name: string;
  status: ProjectStatus;
  elements: ProjectElement[];
  notes?: string;
  /** Codes withdrawn but no longer in the current quotation. */
  orphanedInventoryCodes?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  status?: ProjectStatus;
  notes?: string;
}

export interface ProjectInventoryProduct {
  productId: string;
  code: string;
  name: string;
  type: "roll" | "unit";
  stockQuantity?: number;
  availableArea?: number;
  availableRollCount?: number;
}

export interface ProjectInventoryExcludedService {
  productId: string;
  code: string;
  name: string;
}

export interface ProjectInventoryProductsResult {
  products: ProjectInventoryProduct[];
  unmatchedCodes: string[];
  excludedServices: ProjectInventoryExcludedService[];
}

export interface ActiveInventoryWithdrawalsResult {
  code: string;
  productId: string | null;
  productName: string | null;
  productType: "roll" | "unit" | null;
  rollWithdrawals: Array<{
    id: string;
    productId?: string;
    withdrawnArea?: number;
    totalCost?: number | null;
    withdrawnAt?: unknown;
    projectName?: string;
    reversed?: boolean;
  }>;
  unitMovements: Array<{
    id: string;
    productId?: string;
    productName?: string;
    quantity?: number;
    totalCost?: number | null;
    createdAt?: unknown;
    reversed?: boolean;
  }>;
}

export interface ProjectInventoryWithdrawal {
  id: string;
  sourceType: "roll" | "unit";
  productId: string;
  productName: string;
  quantity: number;
  quantityUnit: "m2" | "unit";
  withdrawnAt?: unknown;
  performedBy?: string;
  performedByName?: string | null;
  reversed: boolean;
  rollId?: string;
  barcodeValue?: string;
  unitCost?: number | null;
  totalCost?: number | null;
}

const BASE = "/api/projects";

export function useProjects() {
  const api = useApi();

  async function list(): Promise<Project[]> {
    const result = await api.get(BASE);
    return (result?.data ?? []) as Project[];
  }

  async function getById(id: string): Promise<Project> {
    const result = await api.get(`${BASE}/${id}`);
    return result?.data as Project;
  }

  async function update(
    id: string,
    payload: UpdateProjectPayload,
  ): Promise<Project> {
    const result = await api.put(`${BASE}/${id}`, payload);
    return result?.data as Project;
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  async function linkDesign(
    projectId: string,
    designId: string,
  ): Promise<Project> {
    const result = await api.post(`${BASE}/${projectId}/elements`, {
      designId,
    });
    return result?.data as Project;
  }

  async function unlinkDesign(
    projectId: string,
    designId: string,
  ): Promise<Project> {
    const result = await api.delete(
      `${BASE}/${projectId}/elements/${designId}`,
    );
    return result?.data as Project;
  }

  async function listInventoryProducts(
    projectId: string,
  ): Promise<ProjectInventoryProductsResult> {
    const result = await api.get(
      `${BASE}/${encodeURIComponent(projectId)}/inventory-products`,
    );
    return (result?.data ?? {
      products: [],
      unmatchedCodes: [],
      excludedServices: [],
    }) as ProjectInventoryProductsResult;
  }

  async function listActiveInventoryWithdrawals(
    projectId: string,
    code: string,
  ): Promise<ActiveInventoryWithdrawalsResult> {
    const result = await api.get(
      `${BASE}/${encodeURIComponent(projectId)}/active-inventory-withdrawals?code=${encodeURIComponent(code)}`,
    );
    return (result?.data ?? {
      code,
      productId: null,
      productName: null,
      productType: null,
      rollWithdrawals: [],
      unitMovements: [],
    }) as ActiveInventoryWithdrawalsResult;
  }

  async function listInventoryWithdrawals(
    projectId: string,
  ): Promise<ProjectInventoryWithdrawal[]> {
    const result = await api.get(
      `${BASE}/${encodeURIComponent(projectId)}/inventory-withdrawals`,
    );
    return (result?.data ?? []) as ProjectInventoryWithdrawal[];
  }

  return {
    list,
    getById,
    update,
    remove,
    linkDesign,
    unlinkDesign,
    listInventoryProducts,
    listActiveInventoryWithdrawals,
    listInventoryWithdrawals,
  };
}
