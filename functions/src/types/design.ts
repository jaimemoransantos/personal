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
  /** Ángulo interior del polígono en el vértice donde termina este lado, en grados. */
  interiorAngleDeg: number;
  /** Ángulo del talud de la pared de este lado, grados desde la horizontal. */
  slopeAngleDeg: number;
}

export interface RelaveraDimensions {
  edges: RelaveraEdge[];
  /** Altura del borde superior en cada vértice (m). Fondo siempre en y=0. */
  vertexHeights: number[];
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export interface RectangularPoolDimensions {
  length: number;
  width: number;
  depth: number;
  /** [largo-A, ancho-B, largo-C, ancho-D] en orden de recorrido del rectángulo. */
  slopeAngles: [number, number, number, number];
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export type DesignDimensions =
  | RoundPoolDimensions
  | RelaveraDimensions
  | RectangularPoolDimensions;

export interface Point2D {
  x: number;
  z: number;
}

export interface DesignAreaBreakdown {
  lateral: number;
  bottomArea: number;
  anchorArea: number;
  subtotal: number;
  wastePercent: number;
  wasteAmount: number;
  total: number;
}

export interface RelaveraAreaResult extends DesignAreaBreakdown {
  topPolygon: Point2D[];
  bottomPolygon: Point2D[];
  outerPolygon: Point2D[];
  adjustmentApplied: boolean;
  adjustmentMeters: number;
}

export interface Design {
  id?: string;
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

export interface CreateDesignData {
  name: string;
  type: DesignType;
  dimensions: DesignDimensions;
  wastePercent?: number;
  notes?: string;
  clientRef?: string;
}
