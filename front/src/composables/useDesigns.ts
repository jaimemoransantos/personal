import { useApi } from "./useApi";

export type DesignType =
  | "piscina_redonda"
  | "piscina_rectangular"
  | "tanque_cilindrico"
  | "tanque_rectangular"
  | "relavera";

export interface RoundPoolDimensions {
  rTop: number;
  rBottom: number;
  depth: number;
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export interface RelaveraEdge {
  length: number;
  interiorAngleDeg: number;
  slopeAngleDeg: number;
}

export interface RelaveraDimensions {
  edges: RelaveraEdge[];
  vertexHeights: number[];
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export interface RectangularPoolDimensions {
  length: number;
  width: number;
  depth: number;
  slopeAngles: [number, number, number, number];
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export type DesignDimensions =
  | RoundPoolDimensions
  | RelaveraDimensions
  | RectangularPoolDimensions;

export interface DesignAreaBreakdown {
  lateral: number;
  bottomArea: number;
  anchorArea: number;
  subtotal: number;
  wastePercent: number;
  wasteAmount: number;
  total: number;
}

export interface Design {
  id: string;
  organizationId: string;
  name: string;
  type: DesignType;
  dimensions: DesignDimensions;
  area: DesignAreaBreakdown;
  notes?: string;
  clientRef?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export interface CreateDesignPayload {
  name: string;
  type: DesignType;
  dimensions: DesignDimensions;
  wastePercent?: number;
  notes?: string;
  clientRef?: string;
}

const BASE = "/api/designs";

export function useDesigns() {
  const api = useApi();

  async function list(): Promise<Design[]> {
    const result = await api.get(BASE);
    return (result?.data ?? []) as Design[];
  }

  async function getById(id: string): Promise<Design> {
    const result = await api.get(`${BASE}/${id}`);
    return result?.data as Design;
  }

  async function create(payload: CreateDesignPayload): Promise<Design> {
    const result = await api.post(BASE, payload);
    return result?.data as Design;
  }

  async function update(
    id: string,
    payload: Partial<CreateDesignPayload>,
  ): Promise<Design> {
    const result = await api.put(`${BASE}/${id}`, payload);
    return result?.data as Design;
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  return { list, getById, create, update, remove };
}
