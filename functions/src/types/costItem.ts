import type { Timestamp } from "firebase-admin/firestore";

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
  id?: string;
  organizationId: string;
  projectId: string;
  category: CostItemCategory;
  description: string;
  estimatedAmount?: number;
  /** Siempre calculado/validado en backend. */
  amount: number;
  /** Solo si category === "labor". */
  laborFormula?: LaborFormula;
  /**
   * Solo relevante si category === "materials",
   * para comparar contra el m² geométrico del diseño vinculado (liquidación).
   */
  actualM2?: number;
  /**
   * Marks system-managed inventory cost rubros.
   * Used to upsert "Materiales (inventario)" from roll/unit withdrawals.
   */
  source?: "inventory";
  invoiceUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

export interface CreateCostItemData {
  category: CostItemCategory;
  description: string;
  estimatedAmount?: number;
  /**
   * Ignorado si category === "labor" y hay laborFormula
   * (se recalcula de laborFormula).
   */
  amount?: number;
  laborFormula?: LaborFormula;
  actualM2?: number;
}
