/**
 * Product - stored in top-level collection "products" with organizationId.
 */
export interface Product {
  id?: string;
  organizationId: string;
  code: string;
  name: string;
  subtitle: string;
  price: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  subtitle: string;
  price: number;
}
