import type { Timestamp } from "firebase-admin/firestore";

/**
 * Stock movement for products with type === "unit".
 * Stored in top-level collection "unitStockMovements" with organizationId.
 */
export type UnitStockMovementType = "in" | "out";

export interface UnitStockMovement {
  organizationId: string;
  productId: string;
  /** Snapshot at movement time. */
  productName: string;
  type: UnitStockMovementType;
  quantity: number;
  /** Only for type === "out". */
  projectId?: string;
  /** Snapshot at withdrawal time. */
  projectName?: string;
  /**
   * Snapshot of product.unitCost at movement (or after admin backfill).
   * Null if the product had no cost yet. Never exposed to chief/technician.
   */
  unitCost?: number | null;
  /**
   * quantity * unitCost when unitCost is known; otherwise null.
   */
  totalCost?: number | null;
  performedBy?: string;
  createdAt: Timestamp;
  /** Soft-reverse flag; reversed outs stay in DB but are excluded from totals. */
  reversed?: boolean;
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
}

export interface UnitStockInData {
  productId: string;
  quantity: number;
}

export interface UnitStockOutData {
  productId: string;
  quantity: number;
  projectId: string;
}

/** Aggregated / display stock row for a unit product. */
export interface UnitProductStock {
  productId: string;
  productName: string;
  productCode: string;
  stockQuantity: number;
  /** Only included for admin responses. */
  unitCost?: number | null;
}
