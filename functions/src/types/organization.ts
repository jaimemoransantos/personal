/**
 * Organization (company) - tenant in a future SaaS.
 * Stored in Firestore collection "organizations".
 */
export interface Organization {
  id: string;
  name: string;
  slug?: string;
  /** Physical address (dirección) */
  address?: string;
  /** Tax ID / RUC */
  ruc?: string;
  /** Contact phone number (número de contacto) */
  contactPhone?: string;
  /** Contact email (correo electrónico) */
  email?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  address?: string;
  ruc?: string;
  contactPhone?: string;
  email?: string;
}
