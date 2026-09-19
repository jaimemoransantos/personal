import { useApi } from "./useApi";

export type ProductType = "roll" | "unit";

export interface UnitStockMovement {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  type: "in" | "out";
  quantity: number;
  projectId?: string;
  projectName?: string;
  unitCost?: number | null;
  totalCost?: number | null;
  performedBy?: string;
  performedByName?: string | null;
  createdAt?: unknown;
  reversed?: boolean;
  reversedAt?: unknown;
  reversedBy?: string | null;
}

export interface UnitProductStock {
  productId: string;
  productName: string;
  productCode: string;
  stockQuantity: number;
  /** Only present for admin. */
  unitCost?: number | null;
}

export interface UnitStockInPayload {
  productId: string;
  quantity: number;
}

export interface UnitStockOutPayload {
  productId: string;
  quantity: number;
  projectId: string;
}

export interface UnitProduct {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  price?: number;
  type?: ProductType;
  stockQuantity?: number;
  unitCost?: number | null;
}

const BASE = "/api/unit-stock";

export function useUnitStock() {
  const api = useApi();

  async function stockIn(payload: UnitStockInPayload): Promise<{
    product: UnitProduct;
    movement: UnitStockMovement;
  }> {
    const result = await api.post(`${BASE}/in`, payload);
    return result?.data as { product: UnitProduct; movement: UnitStockMovement };
  }

  async function stockOut(payload: UnitStockOutPayload): Promise<{
    product: UnitProduct;
    movement: UnitStockMovement;
  }> {
    const result = await api.post(`${BASE}/out`, payload);
    return result?.data as { product: UnitProduct; movement: UnitStockMovement };
  }

  async function getStock(): Promise<UnitProductStock[]> {
    const result = await api.get(`${BASE}/stock`);
    return (result?.data ?? []) as UnitProductStock[];
  }

  async function listMovementsByProduct(
    productId: string,
  ): Promise<UnitStockMovement[]> {
    const result = await api.get(
      `${BASE}/products/${encodeURIComponent(productId)}/movements`,
    );
    return (result?.data ?? []) as UnitStockMovement[];
  }

  async function updateUnitCost(
    productId: string,
    unitCost: number | null,
  ): Promise<UnitProduct> {
    const result = await api.patch(
      `/api/products/${encodeURIComponent(productId)}/unit-cost`,
      { unitCost },
    );
    return result?.data as UnitProduct;
  }

  async function reverseOutMovement(
    movementId: string,
  ): Promise<UnitStockMovement> {
    const result = await api.patch(
      `${BASE}/movements/${encodeURIComponent(movementId)}/reverse`,
      {},
    );
    return result?.data as UnitStockMovement;
  }

  return {
    stockIn,
    stockOut,
    getStock,
    listMovementsByProduct,
    updateUnitCost,
    reverseOutMovement,
  };
}
