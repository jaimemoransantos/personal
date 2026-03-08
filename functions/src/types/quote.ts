/**
 * Quote line item (product row in the quote).
 */
export interface QuoteItem {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  quantity: number;
  price: number;
}

/**
 * Client snapshot stored on the quote.
 * Only name is required; other fields are optional (may not be available when creating the quote).
 */
export interface QuoteClient {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  directedTo?: string;
  reference?: string;
  project?: string;
}

/** Quote status for list and filtering. */
export type QuoteStatus = "pending" | "accepted" | "rejected";

/**
 * Quote - stored in organizations/{organizationId}/quotes.
 * organizationId is stored in the document for consistency and querying.
 */
export interface Quote {
  id?: string;
  organizationId: string;
  /** When the quote was created from an existing customer (selected from list). */
  customerId?: string;
  client: QuoteClient;
  items: QuoteItem[];
  discount: number;
  /** Status of the quote. Default "pending". */
  status?: QuoteStatus;
  /**
   * Lowercase concatenation of client name, reference, project for search.
   * Set on create/update from client data.
   */
  searchTerms?: string;
  /**
   * Precalculated monetary fields for fast list rendering.
   * `amount` = subtotal - appliedDiscount (clamped to [0, subtotal]).
   */
  subtotal?: number;
  amount?: number;
  validity?: string;
  deliveryPlace?: "" | "on_site" | "warehouse";
  deliveryTime?: string;
  paymentMethod?: string;
  disclaimer?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface CreateQuoteData {
  /** Id of customer document when user selected an existing client; optional. */
  customerId?: string;
  client: QuoteClient;
  items: QuoteItem[];
  discount: number;
  status?: QuoteStatus;
  validity?: string;
  deliveryPlace?: "" | "on_site" | "warehouse";
  deliveryTime?: string;
  paymentMethod?: string;
  disclaimer?: string;
  notes?: string;
}
