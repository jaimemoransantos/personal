import { useApi } from "./useApi";

export interface Roll {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  barcodeValue: string;
  /** Physical length in linear meters (reference). */
  rollLength: number;
  /** Physical width in meters (reference). */
  rollWidth: number;
  /** = rollLength * rollWidth — real stock unit (m²). */
  totalArea: number;
  remainingArea: number;
  /** Cost per m². Only present for admin; null until assigned. */
  unitCost?: number | null;
  receivedAt?: unknown;
  batchNumber?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface RollWithdrawal {
  id: string;
  organizationId: string;
  rollId: string;
  productId: string;
  projectId: string;
  projectName: string;
  /** m² withdrawn. */
  withdrawnArea: number;
  unitCost?: number | null;
  totalCost?: number | null;
  withdrawnAt?: unknown;
  performedBy?: string;
  performedByName?: string | null;
  reversed?: boolean;
  reversedAt?: unknown;
  reversedBy?: string | null;
}

export interface ProductStock {
  productId: string;
  productName: string;
  /** Sum of remainingArea, in m² (0 if no available rolls). */
  availableArea: number;
  availableRollCount: number;
}

export interface RegisterRollPayload {
  productId: string;
  barcodeValue: string;
  rollLength: number;
  rollWidth: number;
  batchNumber?: string;
  notes?: string;
}

export interface WithdrawRollPayload {
  barcodeValue: string;
  projectId: string;
  withdrawnArea: number;
}

export interface SetRollCostPayload {
  mode: "total" | "perM2";
  totalCost?: number;
  unitCost?: number;
}

export interface RollCostingGroup {
  batchNumber: string | null;
  receivedDate: string;
  receivedAt: unknown;
  rolls: Roll[];
}

export interface RollCostingProduct {
  productId: string;
  productName: string;
  totalRolls: number;
  uncostedRolls: number;
  groups: RollCostingGroup[];
}

const BASE = "/api/rolls";

export function useRolls() {
  const api = useApi();

  async function register(payload: RegisterRollPayload): Promise<Roll> {
    const result = await api.post(BASE, payload);
    return result?.data as Roll;
  }

  async function lookupByBarcode(barcode: string): Promise<Roll | null> {
    try {
      const result = await api.get(
        `${BASE}?barcode=${encodeURIComponent(barcode.trim())}`,
      );
      return (result?.data ?? null) as Roll | null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      if (message.toLowerCase().includes("rollo no encontrado")) {
        return null;
      }
      throw e;
    }
  }

  async function listByProduct(productId: string): Promise<Roll[]> {
    const result = await api.get(
      `${BASE}?productId=${encodeURIComponent(productId)}`,
    );
    return (result?.data ?? []) as Roll[];
  }

  async function listAll(onlyAvailable = true): Promise<Roll[]> {
    const q = onlyAvailable ? "" : "?onlyAvailable=false";
    const result = await api.get(`${BASE}${q}`);
    return (result?.data ?? []) as Roll[];
  }

  async function withdraw(payload: WithdrawRollPayload): Promise<RollWithdrawal> {
    const result = await api.post(`${BASE}/withdraw`, payload);
    return result?.data as RollWithdrawal;
  }

  async function getStock(): Promise<ProductStock[]> {
    const result = await api.get(`${BASE}/stock`);
    return (result?.data ?? []) as ProductStock[];
  }

  async function listWithdrawalsByProject(
    projectId: string,
  ): Promise<RollWithdrawal[]> {
    const result = await api.get(
      `${BASE}/withdrawals?projectId=${encodeURIComponent(projectId)}`,
    );
    return (result?.data ?? []) as RollWithdrawal[];
  }

  async function listWithdrawalsByRoll(
    rollId: string,
  ): Promise<RollWithdrawal[]> {
    const result = await api.get(
      `${BASE}/${encodeURIComponent(rollId)}/withdrawals`,
    );
    return (result?.data ?? []) as RollWithdrawal[];
  }

  async function reverseWithdrawal(withdrawalId: string): Promise<RollWithdrawal> {
    const result = await api.patch(
      `${BASE}/withdrawals/${encodeURIComponent(withdrawalId)}/reverse`,
      {},
    );
    return result?.data as RollWithdrawal;
  }

  async function listForCosting(): Promise<RollCostingProduct[]> {
    const result = await api.get(`${BASE}/costing`);
    return (result?.data ?? []) as RollCostingProduct[];
  }

  async function setCost(
    rollId: string,
    payload: SetRollCostPayload,
  ): Promise<Roll> {
    const result = await api.patch(
      `${BASE}/${encodeURIComponent(rollId)}/cost`,
      payload,
    );
    return result?.data as Roll;
  }

  return {
    register,
    lookupByBarcode,
    listByProduct,
    listAll,
    withdraw,
    getStock,
    listWithdrawalsByProject,
    listWithdrawalsByRoll,
    reverseWithdrawal,
    listForCosting,
    setCost,
  };
}
