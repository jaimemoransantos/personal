/**
 * Product - stored in top-level collection "products" with organizationId.
 *
 * `kind` distinguishes physical catalog items (inventory) from services
 * (dirección técnica, topografía, etc.). Missing `kind` is treated as
 * "producto" for backwards compatibility.
 *
 * `type` distinguishes geomembrane rolls (barcode + area) from discrete
 * unit products (numeric stockQuantity). Only applies when kind === "producto".
 * Missing `type` is treated as "roll" for legacy documents.
 */
export type ProductType = "roll" | "unit";
export type ProductKind = "producto" | "servicio";

export interface Product {
  id?: string;
  organizationId: string;
  code: string;
  name: string;
  subtitle: string;
  price: number;
  /** Defaults to "producto" when absent (legacy products). */
  kind?: ProductKind;
  /**
   * Inventory handling. Only meaningful when kind === "producto".
   * Defaults to "roll" when absent (legacy products).
   */
  type?: ProductType;
  /** Current available units. Only for type === "unit". */
  stockQuantity?: number;
  /**
   * Fixed cost per unit. Only for type === "unit".
   * Nullable until an admin assigns a cost. Never exposed to chief/technician.
   */
  unitCost?: number | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  subtitle: string;
  price: number;
  /** Required on create — 'producto' | 'servicio'. */
  kind: ProductKind;
  /**
   * Required when kind === 'producto'. Ignored for servicios.
   */
  type?: ProductType;
}

export interface UpdateProductData {
  code?: string;
  name?: string;
  subtitle?: string;
  price?: number;
  kind?: ProductKind;
  type?: ProductType;
}

/** Effective product kind (legacy docs without `kind` are physical products). */
export function resolveProductKind(
  product: Pick<Product, "kind"> | null | undefined,
): ProductKind {
  return product?.kind === "servicio" ? "servicio" : "producto";
}

/** Effective product type (legacy docs without `type` are rolls). */
export function resolveProductType(
  product: Pick<Product, "type"> | null | undefined,
): ProductType {
  return product?.type === "unit" ? "unit" : "roll";
}

/** True when the product can participate in inventory flows. */
export function isInventoryProduct(
  product: Pick<Product, "kind"> | null | undefined,
): boolean {
  return resolveProductKind(product) === "producto";
}
