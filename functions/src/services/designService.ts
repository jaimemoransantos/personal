import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type {
  Design,
  CreateDesignData,
  DesignAreaBreakdown,
  RoundPoolDimensions,
  RelaveraDimensions,
  RectangularPoolDimensions,
  RelaveraEdge,
  DesignType,
  DesignDimensions,
  RelaveraAreaResult,
} from "../types/design";
import { ApiError } from "../utils/errors";

const DESIGNS_COLLECTION = "designs";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcRoundPoolArea(
  dims: RoundPoolDimensions,
  wastePercent: number,
): DesignAreaBreakdown {
  const { rTop, rBottom, depth, anchorWidth, hasFlatBottom } = dims;

  const slant = Math.sqrt(depth ** 2 + (rTop - rBottom) ** 2);
  const lateral = Math.PI * (rTop + rBottom) * slant;
  const bottomArea = hasFlatBottom ? Math.PI * rBottom ** 2 : 0;
  const anchorArea = Math.PI * ((rTop + anchorWidth) ** 2 - rTop ** 2);
  const subtotal = lateral + bottomArea + anchorArea;
  const wasteAmount = subtotal * (wastePercent / 100);
  const total = subtotal + wasteAmount;

  return {
    lateral: round2(lateral),
    bottomArea: round2(bottomArea),
    anchorArea: round2(anchorArea),
    subtotal: round2(subtotal),
    wastePercent,
    wasteAmount: round2(wasteAmount),
    total: round2(total),
  };
}

type Point2D = { x: number; z: number };
type Point3D = { x: number; y: number; z: number };

export interface TopPolygonBuildResult {
  polygon: Point2D[];
  adjustmentApplied: boolean;
  adjustmentMeters: number;
}

export function buildTopPolygon(
  edges: RelaveraEdge[],
): TopPolygonBuildResult {
  let headingRad = 0;
  let point: Point2D = { x: 0, z: 0 };
  const vertices: Point2D[] = [point];
  for (let i = 0; i < edges.length; i++) {
    const next: Point2D = {
      x: point.x + edges[i].length * Math.cos(headingRad),
      z: point.z + edges[i].length * Math.sin(headingRad),
    };
    vertices.push(next);
    point = next;
    const nextEdge = edges[(i + 1) % edges.length];
    const turnRad = ((180 - nextEdge.interiorAngleDeg) * Math.PI) / 180;
    headingRad += turnRad;
  }

  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  const error = {
    x: last.x - first.x,
    z: last.z - first.z,
  };
  const closureGap = Math.hypot(error.x, error.z);
  const perimeter = edges.reduce((sum, e) => sum + e.length, 0);
  const NEGLIGIBLE_TOLERANCE = Math.max(0.05, perimeter * 0.005);
  const ADJUSTABLE_TOLERANCE = perimeter * 0.02;

  if (closureGap <= NEGLIGIBLE_TOLERANCE) {
    vertices.pop();
    return {
      polygon: vertices,
      adjustmentApplied: false,
      adjustmentMeters: 0,
    };
  }

  if (closureGap > ADJUSTABLE_TOLERANCE) {
    throw new ApiError(
      400,
      `Los lados no cierran el polígono (desfase de ${closureGap.toFixed(2)}m). Revisa las longitudes y ángulos.`,
    );
  }

  let cumulative = 0;
  const adjustedVertices: Point2D[] = [vertices[0]];
  for (let i = 1; i <= edges.length; i++) {
    cumulative += edges[i - 1].length;
    const fraction = cumulative / perimeter;
    adjustedVertices.push({
      x: vertices[i].x - error.x * fraction,
      z: vertices[i].z - error.z * fraction,
    });
  }
  adjustedVertices.pop();

  return {
    polygon: adjustedVertices,
    adjustmentApplied: true,
    adjustmentMeters: closureGap,
  };
}

/** Suma de ángulos de giro (180° − interior) debe ser ≈360° para un polígono simple. */
export function validateRelaveraTurnAngles(edges: RelaveraEdge[]): void {
  const n = edges.length;
  if (n < 3) {
    throw new ApiError(400, "Una relavera necesita al menos 3 lados");
  }
  const turnSum = edges.reduce(
    (sum, edge) => sum + (180 - edge.interiorAngleDeg),
    0,
  );
  const tolerance = 1.0;
  if (Math.abs(turnSum - 360) > tolerance) {
    throw new ApiError(
      400,
      `La suma de ángulos de giro es ${turnSum.toFixed(1)}°, debe ser aproximadamente 360°. Revisa los ángulos interiores.`,
    );
  }
}

function orientation(a: Point2D, b: Point2D, c: Point2D): number {
  const val = (b.z - a.z) * (c.x - b.x) - (b.x - a.x) * (c.z - b.z);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a: Point2D, b: Point2D, c: Point2D): boolean {
  return (
    Math.min(a.x, c.x) - 1e-9 <= b.x &&
    b.x <= Math.max(a.x, c.x) + 1e-9 &&
    Math.min(a.z, c.z) - 1e-9 <= b.z &&
    b.z <= Math.max(a.z, c.z) + 1e-9
  );
}

function segmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;

  return false;
}

/** Detecta intersección entre lados no adyacentes del polígono. */
export function hasPolygonSelfIntersection(pts: Point2D[]): boolean {
  const n = pts.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const a1 = pts[i]!;
    const a2 = pts[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      if (j === (i + 1) % n || i === (j + 1) % n) continue;
      const b1 = pts[j]!;
      const b2 = pts[(j + 1) % n]!;
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function polygonArea(pts: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}

function centroid(pts: Point2D[]): Point2D {
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

type OffsetLine = { point: Point2D; dir: { x: number; z: number } };

export function intersectLines(lineA: OffsetLine, lineB: OffsetLine): Point2D {
  const { point: p1, dir: d1 } = lineA;
  const { point: p2, dir: d2 } = lineB;
  const denom = d1.x * d2.z - d1.z * d2.x;
  if (Math.abs(denom) < 1e-9) {
    return { x: (p1.x + p2.x) / 2, z: (p1.z + p2.z) / 2 };
  }
  const t = ((p2.x - p1.x) * d2.z - (p2.z - p1.z) * d2.x) / denom;
  return { x: p1.x + d1.x * t, z: p1.z + d1.z * t };
}

export function offsetPolygon(
  pts: Point2D[],
  offsets: number[],
  direction: "inward" | "outward",
): Point2D[] {
  const c = centroid(pts);
  const n = pts.length;
  const offsetLines: OffsetLine[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const dirX = dx / len;
    const dirZ = dz / len;
    const n1 = { x: -dirZ, z: dirX };
    const n2 = { x: dirZ, z: -dirX };
    const mid = { x: (p1.x + p2.x) / 2, z: (p1.z + p2.z) / 2 };
    const towardCentroid = { x: c.x - mid.x, z: c.z - mid.z };
    const dot1 = n1.x * towardCentroid.x + n1.z * towardCentroid.z;
    const inwardNormal = dot1 > 0 ? n1 : n2;
    const normal =
      direction === "inward"
        ? inwardNormal
        : { x: -inwardNormal.x, z: -inwardNormal.z };
    const offsetDist = offsets[i];
    const shiftedP1 = {
      x: p1.x + normal.x * offsetDist,
      z: p1.z + normal.z * offsetDist,
    };
    offsetLines.push({ point: shiftedP1, dir: { x: dirX, z: dirZ } });
  }
  const newVertices: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const lineA = offsetLines[(i - 1 + n) % n];
    const lineB = offsetLines[i];
    newVertices.push(intersectLines(lineA, lineB));
  }
  return newVertices;
}

function triangleArea3D(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const cross = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  return (
    0.5 *
    Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2)
  );
}

function quadLateralArea(
  top0: Point3D,
  top1: Point3D,
  bot0: Point3D,
  bot1: Point3D,
): number {
  return (
    triangleArea3D(top0, top1, bot0) + triangleArea3D(top1, bot1, bot0)
  );
}

export function calcRelaveraArea(
  dims: RelaveraDimensions,
  wastePercent: number,
): RelaveraAreaResult {
  if (!dims.edges || dims.edges.length < 3) {
    throw new ApiError(400, "Una relavera necesita al menos 3 lados");
  }

  for (const edge of dims.edges) {
    if (edge.slopeAngleDeg <= 0 || edge.slopeAngleDeg >= 90) {
      throw new ApiError(
        400,
        "El ángulo de talud debe estar entre 0 y 90 grados",
      );
    }
  }

  validateRelaveraTurnAngles(dims.edges);

  if (
    !dims.vertexHeights ||
    dims.vertexHeights.length !== dims.edges.length
  ) {
    throw new ApiError(
      400,
      "vertexHeights debe tener un valor por cada vértice",
    );
  }

  const {
    polygon: topPolygon,
    adjustmentApplied,
    adjustmentMeters,
  } = buildTopPolygon(dims.edges);
  if (hasPolygonSelfIntersection(topPolygon)) {
    throw new ApiError(
      400,
      "El polígono se autointersecta. Revisa las longitudes y ángulos.",
    );
  }
  const bottomOffsets = dims.edges.map((e, i) => {
    const h1 = dims.vertexHeights[i];
    const h2 = dims.vertexHeights[(i + 1) % dims.edges.length];
    const avgHeight = (h1 + h2) / 2;
    const slopeRad = (e.slopeAngleDeg * Math.PI) / 180;
    return avgHeight / Math.tan(slopeRad);
  });
  const bottomPolygon = offsetPolygon(topPolygon, bottomOffsets, "inward");
  const bottomArea = dims.hasFlatBottom ? polygonArea(bottomPolygon) : 0;

  const n = dims.edges.length;
  let lateral = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const top0: Point3D = {
      x: topPolygon[i].x,
      y: dims.vertexHeights[i],
      z: topPolygon[i].z,
    };
    const top1: Point3D = {
      x: topPolygon[j].x,
      y: dims.vertexHeights[j],
      z: topPolygon[j].z,
    };
    const bot0: Point3D = {
      x: bottomPolygon[i].x,
      y: 0,
      z: bottomPolygon[i].z,
    };
    const bot1: Point3D = {
      x: bottomPolygon[j].x,
      y: 0,
      z: bottomPolygon[j].z,
    };
    lateral += quadLateralArea(top0, top1, bot0, bot1);
  }

  const anchorOffsets = dims.edges.map(() => dims.anchorWidth);
  const outerPolygon = offsetPolygon(topPolygon, anchorOffsets, "outward");
  const anchorArea =
    polygonArea(outerPolygon) - polygonArea(topPolygon);

  const subtotal = lateral + bottomArea + anchorArea;
  const wasteAmount = subtotal * (wastePercent / 100);
  const total = subtotal + wasteAmount;

  return {
    lateral: round2(lateral),
    bottomArea: round2(bottomArea),
    anchorArea: round2(anchorArea),
    subtotal: round2(subtotal),
    wastePercent,
    wasteAmount: round2(wasteAmount),
    total: round2(total),
    topPolygon,
    bottomPolygon,
    outerPolygon,
    adjustmentApplied,
    adjustmentMeters,
  };
}

export function calcRectangularPoolArea(
  dims: RectangularPoolDimensions,
  wastePercent: number,
): RelaveraAreaResult {
  const relaveraDims: RelaveraDimensions = {
    edges: [
      {
        length: dims.length,
        interiorAngleDeg: 90,
        slopeAngleDeg: dims.slopeAngles[0],
      },
      {
        length: dims.width,
        interiorAngleDeg: 90,
        slopeAngleDeg: dims.slopeAngles[1],
      },
      {
        length: dims.length,
        interiorAngleDeg: 90,
        slopeAngleDeg: dims.slopeAngles[2],
      },
      {
        length: dims.width,
        interiorAngleDeg: 90,
        slopeAngleDeg: dims.slopeAngles[3],
      },
    ],
    vertexHeights: [dims.depth, dims.depth, dims.depth, dims.depth],
    anchorWidth: dims.anchorWidth,
    hasFlatBottom: dims.hasFlatBottom,
  };
  return calcRelaveraArea(relaveraDims, wastePercent);
}

export function computeArea(data: {
  type: DesignType;
  dimensions: DesignDimensions;
  wastePercent?: number;
}): DesignAreaBreakdown {
  const wastePercent = data.wastePercent ?? 0;

  switch (data.type) {
    case "piscina_redonda":
      return calcRoundPoolArea(
        data.dimensions as RoundPoolDimensions,
        wastePercent,
      );
    case "relavera":
      return calcRelaveraArea(
        data.dimensions as RelaveraDimensions,
        wastePercent,
      );
    case "piscina_rectangular":
      return calcRectangularPoolArea(
        data.dimensions as RectangularPoolDimensions,
        wastePercent,
      );
    case "tanque_cilindrico":
      return calcRoundPoolArea(
        data.dimensions as RoundPoolDimensions,
        wastePercent,
      );
    case "tanque_rectangular":
      return calcRectangularPoolArea(
        data.dimensions as RectangularPoolDimensions,
        wastePercent,
      );
    default:
      throw new ApiError(400, "todavía no está implementado");
  }
}

export class DesignService {
  static async list(
    organizationId: string,
  ): Promise<(Design & { id: string })[]> {
    const snapshot = await db
      .collection(DESIGNS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Design & { id: string })[];
  }

  static async getById(
    organizationId: string,
    designId: string,
  ): Promise<(Design & { id: string }) | null> {
    const doc = await db.collection(DESIGNS_COLLECTION).doc(designId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Design & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    return { id: doc.id, ...data } as Design & { id: string };
  }

  static async create(
    organizationId: string,
    data: CreateDesignData,
    createdBy?: string,
  ): Promise<Design & { id: string }> {
    const ref = db.collection(DESIGNS_COLLECTION).doc();
    const now = Timestamp.now();
    const area = computeArea({
      type: data.type,
      dimensions: data.dimensions,
      wastePercent: data.wastePercent,
    });

    const design: Omit<Design, "id"> = {
      organizationId,
      name: data.name,
      type: data.type,
      dimensions: data.dimensions,
      area,
      notes: data.notes ?? "",
      ...(data.clientRef ? { clientRef: data.clientRef } : {}),
      createdAt: now,
      updatedAt: now,
      ...(createdBy ? { createdBy } : {}),
    };
    await ref.set(design);
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Design & { id: string };
  }

  static async update(
    organizationId: string,
    designId: string,
    data: Partial<CreateDesignData>,
  ): Promise<Design & { id: string }> {
    const ref = db.collection(DESIGNS_COLLECTION).doc(designId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Diseño no encontrado");
    }
    const existing = doc.data() as Design & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Diseño no encontrado");
    }

    const effectiveType = data.type ?? existing.type;
    const effectiveDimensions = data.dimensions ?? existing.dimensions;
    const effectiveWastePercent =
      data.wastePercent !== undefined
        ? data.wastePercent
        : (existing.area?.wastePercent ?? 0);
    const area = computeArea({
      type: effectiveType,
      dimensions: effectiveDimensions,
      wastePercent: effectiveWastePercent,
    });

    const updatePayload: Record<string, unknown> = {
      name: data.name ?? existing.name,
      type: effectiveType,
      dimensions: effectiveDimensions,
      area,
      updatedAt: Timestamp.now(),
    };
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.clientRef !== undefined) updatePayload.clientRef = data.clientRef;

    await ref.update(updatePayload);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Design & { id: string };
  }

  static async delete(
    organizationId: string,
    designId: string,
  ): Promise<void> {
    const ref = db.collection(DESIGNS_COLLECTION).doc(designId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Diseño no encontrado");
    }
    const data = doc.data() as { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Diseño no encontrado");
    }
    await ref.delete();
  }
}
