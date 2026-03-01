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
 */
export interface QuoteClient {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  directedTo?: string;
  reference?: string;
  project?: string;
}

/**
 * Quote - stored in organizations/{organizationId}/quotes.
 * organizationId is stored in the document for consistency and querying.
 */
export interface Quote {
  id?: string;
  organizationId: string;
  client: QuoteClient;
  items: QuoteItem[];
  discount: number;
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
  client: QuoteClient;
  items: QuoteItem[];
  discount: number;
  validity?: string;
  deliveryPlace?: "" | "on_site" | "warehouse";
  deliveryTime?: string;
  paymentMethod?: string;
  disclaimer?: string;
  notes?: string;
}
