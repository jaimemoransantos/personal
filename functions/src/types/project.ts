import type { Timestamp } from "firebase-admin/firestore";
import type { CostItemCategory } from "./costItem";

export type ProjectStatus =
  | "planificado"
  | "instalando"
  | "liquidado"
  | "cerrado";

export interface ProjectElement {
  designId: string;
  /** Snapshot del nombre, por si el diseño se renombra o borra después. */
  designName: string;
  /** Snapshot del tipo (piscina_redonda, relavera, etc.). */
  designType: string;
  /** area.total del diseño AL MOMENTO de vincularlo — no se recalcula después. */
  m2Snapshot: number;
  linkedAt: Timestamp;
}

export interface QuotationSnapshot {
  quoteNumber: string;
  /** Mismo shape que QuoteClient, copiado tal cual. */
  client: unknown;
  /** Mismo shape que los items de la cotización. */
  items: unknown[];
  amount: number;
  subtotal: number;
  discount: number;
}

export interface Project {
  id?: string;
  organizationId: string;
  quotationId: string;
  quotationSnapshot: QuotationSnapshot;
  /** Por defecto: derivado del cliente/quoteNumber. */
  name: string;
  status: ProjectStatus;
  elements: ProjectElement[];
  notes?: string;
  /**
   * Product codes that were withdrawn for this project but are no longer in
   * the current quotation snapshot. Cleared as active withdrawals are reversed.
   */
  orphanedInventoryCodes?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

export interface ProjectPhoto {
  organizationId: string;
  projectId: string;
  url: string;
  uploadedAt: Timestamp;
  uploadedBy?: string;
}

export interface UpdateProjectData {
  name?: string;
  status?: ProjectStatus;
  notes?: string;
}

/** Product from catalog matched to a project's quotation codes. */
export interface ProjectInventoryProduct {
  productId: string;
  code: string;
  name: string;
  type: "roll" | "unit";
  /** Unit products only. Omitted for non-admin when includeStock is false. */
  stockQuantity?: number;
  /** Roll products only. */
  availableArea?: number;
  availableRollCount?: number;
}

/** Quotation catalog match that is a service (not withdrawable). */
export interface ProjectInventoryExcludedService {
  productId: string;
  code: string;
  name: string;
}

export interface ProjectInventoryProductsResult {
  products: ProjectInventoryProduct[];
  /** Quotation codes with no matching catalog product. */
  unmatchedCodes: string[];
  /** Quotation codes matched to kind === "servicio" catalog items. */
  excludedServices: ProjectInventoryExcludedService[];
}

/** Unified project withdrawal row (roll or unit out). */
export interface ProjectInventoryWithdrawal {
  id: string;
  sourceType: "roll" | "unit";
  productId: string;
  productName: string;
  /** Withdrawn m² (roll) or units (unit). */
  quantity: number;
  quantityUnit: "m2" | "unit";
  withdrawnAt: unknown;
  performedBy?: string;
  performedByName?: string | null;
  reversed: boolean;
  /** Roll only. */
  rollId?: string;
  barcodeValue?: string;
  /** Admin only — stripped for chief/technician. */
  unitCost?: number | null;
  totalCost?: number | null;
}

export interface LiquidacionSummary {
  /** Ingreso sin IVA: quotationSnapshot.subtotal - discount. */
  totalIncome: number;
  costsByCategory: Record<CostItemCategory, number>;
  totalCost: number;
  margin: number;
  marginPercentage: number;
  /** Suma de m2Snapshot de elements; null si no hay diseños vinculados. */
  geometricM2: number | null;
  /** Suma de actualM2 de cost items materials; null si ninguno tiene actualM2. */
  actualM2: number | null;
  /**
   * (actualM2 - geometricM2) / geometricM2 * 100;
   * null si falta cualquiera de los dos.
   */
  actualWastePercentage: number | null;
}
