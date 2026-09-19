import type { Timestamp } from "firebase-admin/firestore";

/**
 * Physical geomembrane roll tracked in inventory.
 * Stored in top-level collection "rolls" with organizationId.
 * Stock unit is area (m²) = rollLength × rollWidth.
 */
export interface Roll {
  organizationId: string;
  productId: string;
  /** Snapshot at registration time (survives product rename). */
  productName: string;
  /** Scanned barcode; unique per organization. */
  barcodeValue: string;
  /** Physical length in linear meters (reference). */
  rollLength: number;
  /** Physical width in meters (reference). */
  rollWidth: number;
  /** = rollLength * rollWidth, always computed on backend — real stock unit (m²). */
  totalArea: number;
  /** Starts equal to totalArea; decremented on each withdrawal. */
  remainingArea: number;
  /**
   * Cost per m². Null until an admin assigns it.
   * Never exposed to chief/technician.
   */
  unitCost: number | null;
  /** Always set on registration (import timestamp). */
  receivedAt: Timestamp;
  batchNumber?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

export interface RegisterRollData {
  productId: string;
  barcodeValue: string;
  rollLength: number;
  rollWidth: number;
  batchNumber?: string;
  notes?: string;
}

/**
 * Material withdrawal from a roll against a project.
 * Stored in top-level collection "rollWithdrawals".
 */
export interface RollWithdrawal {
  organizationId: string;
  rollId: string;
  /** Snapshot for fast queries. */
  productId: string;
  projectId: string;
  /** Snapshot at withdrawal time. */
  projectName: string;
  /** m² withdrawn. */
  withdrawnArea: number;
  /**
   * Snapshot of roll.unitCost at withdrawal (or after admin backfill).
   * Null if the roll had no cost yet.
   */
  unitCost: number | null;
  /**
   * withdrawnArea * unitCost when unitCost is known; otherwise null.
   */
  totalCost: number | null;
  withdrawnAt: Timestamp;
  performedBy?: string;
  /** Soft-reverse flag; reversed withdrawals stay in DB but are excluded from totals. */
  reversed?: boolean;
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
}

export interface WithdrawRollData {
  barcodeValue: string;
  projectId: string;
  withdrawnArea: number;
}

/**
 * Aggregated stock for roll products.
 * Catalog roll products appear even when availableArea is 0 (parity with unit stock).
 */
export interface ProductStock {
  productId: string;
  productName: string;
  /** Sum of remainingArea, in m². */
  availableArea: number;
  /** Count of rolls with remainingArea > 0. */
  availableRollCount: number;
}

/** Client sends either total roll cost or cost per m². */
export type SetRollCostMode = "total" | "perM2";

export interface SetRollCostData {
  mode: SetRollCostMode;
  /** Required when mode === "total". */
  totalCost?: number;
  /** Required when mode === "perM2". */
  unitCost?: number;
}

export interface RollCostingGroup {
  batchNumber: string | null;
  /** Reception day key YYYY-MM-DD (UTC). */
  receivedDate: string;
  /** Representative receivedAt of the group (earliest roll). */
  receivedAt: Timestamp | null;
  rolls: (Roll & { id: string })[];
}

export interface RollCostingProduct {
  productId: string;
  productName: string;
  totalRolls: number;
  uncostedRolls: number;
  groups: RollCostingGroup[];
}
