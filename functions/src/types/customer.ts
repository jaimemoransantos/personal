/**
 * Customer (client) - stored in top-level collection "customers" with organizationId.
 */
export interface Customer {
  id?: string;
  organizationId: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface CreateCustomerData {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}
