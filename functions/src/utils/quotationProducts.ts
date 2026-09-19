import type { Project, ProjectStatus, QuotationSnapshot } from "../types/project";
import { ApiError } from "./errors";

/** Project statuses that may receive inventory withdrawals. */
export const INVENTORY_WITHDRAWAL_STATUSES: readonly ProjectStatus[] = [
  "planificado",
  "instalando",
] as const;

/**
 * Unique uppercased product codes from quotation line items.
 */
export function extractCodesFromQuotationItems(items: unknown): Set<string> {
  const codes = new Set<string>();
  if (!Array.isArray(items)) return codes;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const code = (item as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) {
      codes.add(code.trim().toUpperCase());
    }
  }
  return codes;
}

/**
 * Unique uppercased product codes from a project's quotation snapshot.
 */
export function extractQuotationCodes(project: Project): Set<string> {
  return extractCodesFromQuotationItems(project.quotationSnapshot?.items);
}

/**
 * Same shape used when converting a quote → project.
 */
export function buildQuotationSnapshot(quote: {
  quoteNumber?: string | null;
  client: unknown;
  items?: unknown[] | null;
  amount?: number | null;
  subtotal?: number | null;
  discount?: number | null;
}): QuotationSnapshot {
  return {
    quoteNumber: quote.quoteNumber ?? "",
    client: quote.client,
    items: Array.isArray(quote.items) ? quote.items : [],
    amount: typeof quote.amount === "number" ? quote.amount : 0,
    subtotal: typeof quote.subtotal === "number" ? quote.subtotal : 0,
    discount: typeof quote.discount === "number" ? quote.discount : 0,
  };
}

/**
 * Rejects withdrawals (and inventory-product listing for withdraw UX) when the
 * project is liquidado/cerrado. Reverse endpoints must NOT use this.
 */
export function assertProjectAllowsInventoryWithdrawal(
  project: Project,
): void {
  if (
    !INVENTORY_WITHDRAWAL_STATUSES.includes(
      project.status as (typeof INVENTORY_WITHDRAWAL_STATUSES)[number],
    )
  ) {
    throw new ApiError(
      400,
      "No se puede retirar material hacia un proyecto liquidado o cerrado.",
    );
  }
}

/**
 * Rejects withdrawals for products not listed in the project quotation.
 */
export function assertProductCodeInQuotation(
  project: Project,
  productCode: string | null | undefined,
): void {
  const normalized =
    typeof productCode === "string" ? productCode.trim().toUpperCase() : "";
  if (!normalized) {
    throw new ApiError(
      400,
      "Este producto no está en la cotización de este proyecto",
    );
  }
  const codes = extractQuotationCodes(project);
  if (!codes.has(normalized)) {
    throw new ApiError(
      400,
      "Este producto no está en la cotización de este proyecto",
    );
  }
}
